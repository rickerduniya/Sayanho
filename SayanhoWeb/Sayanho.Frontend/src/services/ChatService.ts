import axios from 'axios';
import { ApplicationSettings } from '../utils/ApplicationSettings';
import { api } from './api';
import { CanvasSheet, CanvasItem } from '../types';
import { DiagramContextBuilder } from '../utils/DiagramContextBuilder';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: any[];
    name?: string; // For tool responses in Gemini
}

// Callbacks for diagram manipulation
export interface DiagramCallbacks {
    addItem: (itemName: string, position?: { x: number; y: number }) => Promise<CanvasItem | null>;
    deleteItem: (itemId: string) => void;
    calculateNetwork: () => void;
    getSheets: () => CanvasSheet[];
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const API_URL = import.meta.env.VITE_API_URL;

export class ChatService {
    private history: ChatMessage[] = [];
    private systemPrompt: string = '';
    private diagramCallbacks: DiagramCallbacks | null = null;
    private currentSheets: CanvasSheet[] = [];
    // Hardcoded key for testing as requested
    private readonly TEST_API_KEY = "AIzaSyBwQzP1zEQPNApJniv5IjSZEZQMpfXT5sU";

    constructor() {
        this.reset();
    }

    setDiagramCallbacks(callbacks: DiagramCallbacks) {
        this.diagramCallbacks = callbacks;
    }

    reset() {
        this.history = [];
        this.systemPrompt = `You are an intelligent AI assistant for the Sayanho electrical diagram application.
You have access to the current diagram data, the application database, and can perform actions on the diagram.

## CAPABILITIES

### 1. Diagram Analysis Tools
- **get_diagram_summary**: Get a complete list of items and connections in the diagram
- **analyze_diagram**: Run network analysis to calculate current flow through all connections
- **get_total_load**: Calculate total power consumption, broken down by phase
- **get_phase_balance**: Check if the load is balanced across R, Y, B phases
- **suggest_cable_size**: Get cable size recommendations based on current

### 2. Diagram Modification Tools
- **add_item_to_diagram**: Add a new component to the canvas (e.g., Ceiling Fan, VTPN, etc.)
- **delete_item_from_diagram**: Remove a component by name or ID

### 3. Database Query Tools
- **get_database_schema**: Get database structure (tables and columns)
- **execute_query**: Run a SQL SELECT query on the database
- **get_table_overview**: Get sample rows from a specific table

## BEST PRACTICES

1. **Before making modifications**, always call get_diagram_summary to understand the current state
2. **After modifications**, call analyze_diagram to verify changes are correct
3. **For load-related questions**, use get_total_load and get_phase_balance
4. **For cable sizing**, first analyze_diagram to get currents, then use suggest_cable_size
5. **For price queries**, use the database tools (get_database_schema first)

## DATABASE RULES (for database queries)
- ALL columns are TEXT (even numbers like 'Rate', 'Way')
- For Way: values are like '4 way', '6 way'. Use LIKE '4%'
- For Rate: to find cheapest, use ORDER BY CAST(Rate AS INTEGER)
- For Size: values are like '1.5', '4 sq.mm.'. Use LIKE '1.5%'
- Always check "Index" table first to find correct table names

## AVAILABLE ITEMS TO ADD
Common items: Source, HTPN, VTPN, SPN DB, Main Switch, Change Over Switch, 
Ceiling Fan, Tube Light, LED Downlight, AC, Geyser, Socket, TV Point, 
Exhaust Fan, Water Pump, Motor, Portal
`;
    }

    async initializeContext(sheets: CanvasSheet[]) {
        this.currentSheets = sheets;

        // Build rich context using DiagramContextBuilder
        const diagramContext = DiagramContextBuilder.buildContext(sheets);

        const newSystemContent = this.systemPrompt + "\n" + diagramContext;

        if (this.history.length > 0 && this.history[0].role === 'system') {
            this.history[0].content = newSystemContent;
        } else {
            this.history = [
                { role: 'system', content: newSystemContent },
                ...this.history
            ];
        }
    }

    getHistory(): ChatMessage[] {
        return [...this.history];
    }

    async sendMessage(content: string, isDatabaseQuery: boolean = false): Promise<ChatMessage[]> {
        const settings = ApplicationSettings.getAiSettings();
        const apiKey = settings.apiKey || this.TEST_API_KEY;

        if (!apiKey) {
            throw new Error("API Key not configured.");
        }

        let finalContent = content;
        if (isDatabaseQuery) {
            finalContent = `[USER EXPLICITLY MARKED THIS AS A DATABASE QUERY. YOU MUST USE DATABASE TOOLS]\n${content}`;
        }

        this.history.push({ role: 'user', content: finalContent });

        try {
            let response = await this.callGemini(apiKey, settings.modelName || 'gemini-2.5-flash');

            let maxTurns = 8; // Increased for more complex operations
            let currentTurn = 0;

            while (currentTurn < maxTurns) {
                currentTurn++;

                const candidate = response.candidates?.[0];
                if (!candidate || !candidate.content) {
                    throw new Error("No response from AI");
                }

                const parts = candidate.content.parts || [];
                let textResponse = "";
                const toolCalls: any[] = [];

                for (const part of parts) {
                    if (part.text) {
                        textResponse += part.text;
                    }
                    if (part.functionCall) {
                        toolCalls.push({
                            id: 'call_' + Math.random().toString(36).substr(2, 9),
                            function: {
                                name: part.functionCall.name,
                                arguments: JSON.stringify(part.functionCall.args || {})
                            }
                        });
                    }
                }

                if (textResponse || toolCalls.length > 0) {
                    const assistantMsg: ChatMessage = {
                        role: 'assistant',
                        content: textResponse,
                        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
                    };
                    this.history.push(assistantMsg);
                }

                if (toolCalls.length === 0) {
                    break;
                }

                // Handle all tool calls
                for (const toolCall of toolCalls) {
                    let result;
                    const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

                    try {
                        result = await this.handleToolCall(toolCall.function.name, args);
                    } catch (e: any) {
                        result = { error: e.message || 'Tool execution failed' };
                    }

                    this.history.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                        name: toolCall.function.name
                    } as any);
                }

                response = await this.callGemini(apiKey, settings.modelName || 'gemini-2.5-flash');
            }

            return [...this.history];
        } catch (error: any) {
            console.error("LLM Error", error);
            throw new Error(error.message || "Failed to communicate with AI");
        }
    }

    private async handleToolCall(toolName: string, args: any): Promise<any> {
        switch (toolName) {
            // Database tools
            case 'execute_query':
                return this.executeQuery(args.query);

            case 'get_database_schema':
                return this.getSchema();

            case 'get_table_overview':
                return this.executeQuery(`SELECT * FROM "${args.tableName}" LIMIT 5`);

            // Diagram analysis tools
            case 'get_diagram_summary':
                return this.getDiagramSummary(args.sheetName);

            case 'analyze_diagram':
                return this.analyzeDiagram();

            case 'get_total_load':
                return this.getTotalLoad(args.phase);

            case 'get_phase_balance':
                return this.getPhaseBalance();

            case 'suggest_cable_size':
                return this.suggestCableSize(args.current, args.phases);

            // Diagram modification tools
            case 'add_item_to_diagram':
                return this.addItemToDiagram(args.itemName, args.x, args.y);

            case 'delete_item_from_diagram':
                return this.deleteItemFromDiagram(args.itemId, args.itemName);

            default:
                return { error: `Unknown tool: ${toolName}` };
        }
    }

    // ==================== DIAGRAM ANALYSIS TOOLS ====================

    private getDiagramSummary(sheetName?: string): any {
        const sheets = this.diagramCallbacks?.getSheets() || this.currentSheets;
        return DiagramContextBuilder.getDiagramSummary(sheets, sheetName);
    }

    private analyzeDiagram(): any {
        try {
            // Trigger network calculation
            this.diagramCallbacks?.calculateNetwork();

            const sheets = this.diagramCallbacks?.getSheets() || this.currentSheets;

            // Return analysis results
            const loadAnalysis = DiagramContextBuilder.getLoadAnalysis(sheets);
            const phaseBalance = DiagramContextBuilder.getPhaseBalance(sheets);

            // Get connection currents
            const connectionCurrents: any[] = [];
            sheets.forEach(sheet => {
                sheet.storedConnectors.forEach(conn => {
                    connectionCurrents.push({
                        from: conn.sourceItem?.name || 'Unknown',
                        to: conn.targetItem?.name || 'Unknown',
                        current: conn.currentValues?.Current || '0 A',
                        phase: conn.currentValues?.Phase || 'Unknown',
                        R_Current: conn.currentValues?.R_Current,
                        Y_Current: conn.currentValues?.Y_Current,
                        B_Current: conn.currentValues?.B_Current
                    });
                });
            });

            return {
                success: true,
                message: 'Network analysis complete',
                totalPower: `${loadAnalysis.totalPower.toFixed(2)} W`,
                totalCurrent: `${loadAnalysis.totalCurrent.toFixed(2)} A`,
                phaseBalance: phaseBalance,
                connections: connectionCurrents
            };
        } catch (e: any) {
            return { error: e.message || 'Analysis failed' };
        }
    }

    private getTotalLoad(phase?: string): any {
        const sheets = this.diagramCallbacks?.getSheets() || this.currentSheets;
        const analysis = DiagramContextBuilder.getLoadAnalysis(sheets);

        if (phase && ['R', 'Y', 'B'].includes(phase.toUpperCase())) {
            const p = phase.toUpperCase() as 'R' | 'Y' | 'B';
            return {
                phase: p,
                power: `${analysis.perPhase[p].power.toFixed(2)} W`,
                current: `${analysis.perPhase[p].current.toFixed(2)} A`,
                items: analysis.perPhase[p].items
            };
        }

        return {
            totalPower: `${analysis.totalPower.toFixed(2)} W`,
            totalCurrent: `${analysis.totalCurrent.toFixed(2)} A`,
            perPhase: {
                R: { power: `${analysis.perPhase.R.power.toFixed(2)} W`, current: `${analysis.perPhase.R.current.toFixed(2)} A` },
                Y: { power: `${analysis.perPhase.Y.power.toFixed(2)} W`, current: `${analysis.perPhase.Y.current.toFixed(2)} A` },
                B: { power: `${analysis.perPhase.B.power.toFixed(2)} W`, current: `${analysis.perPhase.B.current.toFixed(2)} A` }
            },
            itemBreakdown: analysis.itemBreakdown.map(i => ({
                name: i.name,
                power: `${i.power.toFixed(2)} W`,
                phase: i.phase
            }))
        };
    }

    private getPhaseBalance(): any {
        const sheets = this.diagramCallbacks?.getSheets() || this.currentSheets;
        return DiagramContextBuilder.getPhaseBalance(sheets);
    }

    private suggestCableSize(current: number, phases?: string): any {
        if (!current || current <= 0) {
            return { error: 'Please provide a valid current value in Amps' };
        }
        return DiagramContextBuilder.getCableRecommendation(current, phases || '1-phase');
    }

    // ==================== DIAGRAM MODIFICATION TOOLS ====================

    private async addItemToDiagram(itemName: string, x?: number, y?: number): Promise<any> {
        if (!this.diagramCallbacks) {
            return { error: 'Diagram callbacks not configured. Cannot modify diagram.' };
        }

        if (!itemName) {
            return { error: 'Please provide an item name to add' };
        }

        try {
            const position = { x: x || 300, y: y || 300 };
            const newItem = await this.diagramCallbacks.addItem(itemName, position);

            if (newItem) {
                this.diagramCallbacks.showToast(`Added ${itemName} to diagram`, 'success');
                return {
                    success: true,
                    message: `Successfully added ${itemName} to the diagram`,
                    item: {
                        name: newItem.name,
                        id: newItem.uniqueID.substring(0, 8),
                        position: position
                    }
                };
            } else {
                return { error: `Failed to add ${itemName}. Item may not exist in the database.` };
            }
        } catch (e: any) {
            return { error: e.message || `Failed to add ${itemName}` };
        }
    }

    private deleteItemFromDiagram(itemId?: string, itemName?: string): any {
        if (!this.diagramCallbacks) {
            return { error: 'Diagram callbacks not configured. Cannot modify diagram.' };
        }

        const sheets = this.diagramCallbacks.getSheets();

        // Find item by ID or name
        let targetItem: CanvasItem | null = null;
        for (const sheet of sheets) {
            for (const item of sheet.canvasItems) {
                if (itemId && item.uniqueID.startsWith(itemId)) {
                    targetItem = item;
                    break;
                }
                if (itemName && item.name.toLowerCase() === itemName.toLowerCase()) {
                    targetItem = item;
                    break;
                }
            }
            if (targetItem) break;
        }

        if (!targetItem) {
            return { error: `Item not found: ${itemId || itemName}` };
        }

        try {
            this.diagramCallbacks.deleteItem(targetItem.uniqueID);
            this.diagramCallbacks.showToast(`Deleted ${targetItem.name}`, 'info');
            return {
                success: true,
                message: `Successfully deleted ${targetItem.name} from the diagram`,
                deletedItem: {
                    name: targetItem.name,
                    id: targetItem.uniqueID.substring(0, 8)
                }
            };
        } catch (e: any) {
            return { error: e.message || 'Failed to delete item' };
        }
    }

    // ==================== DATABASE TOOLS ====================

    private async executeQuery(query: string) {
        try {
            const response = await axios.post(`${API_URL}/chat/query`, { query });
            return response.data;
        } catch (e: any) {
            return { error: e.response?.data?.message || e.message };
        }
    }

    private async getSchema() {
        try {
            const response = await axios.get(`${API_URL}/chat/schema`);
            return response.data;
        } catch (e: any) {
            return { error: e.response?.data?.message || e.message };
        }
    }

    // ==================== GEMINI API ====================

    private async callGemini(apiKey: string, model: string) {
        const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const contents: any[] = [];
        let systemInstruction: any = undefined;

        for (const msg of this.history) {
            if (msg.role === 'system') {
                systemInstruction = {
                    parts: [{ text: msg.content }]
                };
            } else if (msg.role === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'assistant') {
                const parts: any[] = [];
                if (msg.content) parts.push({ text: msg.content });
                if (msg.tool_calls) {
                    msg.tool_calls.forEach(tc => {
                        parts.push({
                            functionCall: {
                                name: tc.function.name,
                                args: JSON.parse(tc.function.arguments)
                            }
                        });
                    });
                }
                contents.push({
                    role: 'model',
                    parts: parts
                });
            } else if (msg.role === 'tool') {
                const functionName = (msg as any).name || 'execute_query';
                contents.push({
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: functionName,
                            response: {
                                name: functionName,
                                content: JSON.parse(msg.content)
                            }
                        }
                    }]
                });
            }
        }

        const tools = [
            {
                functionDeclarations: [
                    // Database Tools
                    {
                        name: "execute_query",
                        description: "Execute a read-only SQL query on the application database.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The SQL SELECT query to execute."
                                }
                            },
                            required: ["query"]
                        }
                    },
                    {
                        name: "get_database_schema",
                        description: "Get the FULL database schema. Returns the entire 'Index' table and for every other table, it returns the column names and the FIRST row as a sample. Call this FIRST before database queries.",
                        parameters: {
                            type: "object",
                            properties: {},
                        }
                    },
                    {
                        name: "get_table_overview",
                        description: "Get the first 5 rows of a specific table to understand its data content better before querying.",
                        parameters: {
                            type: "object",
                            properties: {
                                tableName: {
                                    type: "string",
                                    description: "The name of the table to inspect (e.g. '3', '16')."
                                }
                            },
                            required: ["tableName"]
                        }
                    },
                    // Diagram Analysis Tools
                    {
                        name: "get_diagram_summary",
                        description: "Get a complete summary of all items and connections in the current diagram. Use this to understand what's on the canvas.",
                        parameters: {
                            type: "object",
                            properties: {
                                sheetName: {
                                    type: "string",
                                    description: "Optional: filter by sheet name"
                                }
                            }
                        }
                    },
                    {
                        name: "analyze_diagram",
                        description: "Run network analysis to calculate current flow through all connections. Returns total power, current values, and phase information for each connection.",
                        parameters: {
                            type: "object",
                            properties: {}
                        }
                    },
                    {
                        name: "get_total_load",
                        description: "Calculate total power consumption and current draw, optionally filtered by phase.",
                        parameters: {
                            type: "object",
                            properties: {
                                phase: {
                                    type: "string",
                                    description: "Optional: R, Y, or B to get load for specific phase"
                                }
                            }
                        }
                    },
                    {
                        name: "get_phase_balance",
                        description: "Check if the electrical load is balanced across R, Y, B phases. Returns imbalance percentage and recommendations.",
                        parameters: {
                            type: "object",
                            properties: {}
                        }
                    },
                    {
                        name: "suggest_cable_size",
                        description: "Get cable size recommendations based on current. Returns minimum size and recommended size with options.",
                        parameters: {
                            type: "object",
                            properties: {
                                current: {
                                    type: "number",
                                    description: "The current in Amps that the cable needs to carry"
                                },
                                phases: {
                                    type: "string",
                                    description: "Optional: '1-phase' or '3-phase'. Defaults to 1-phase."
                                }
                            },
                            required: ["current"]
                        }
                    },
                    // Diagram Modification Tools
                    {
                        name: "add_item_to_diagram",
                        description: "Add a new electrical component to the canvas. Available items include: Source, HTPN, VTPN, SPN DB, Main Switch, Change Over Switch, Ceiling Fan, Tube Light, LED Downlight, AC, Geyser, Socket, TV Point, Exhaust Fan, Water Pump, Motor, Portal, etc.",
                        parameters: {
                            type: "object",
                            properties: {
                                itemName: {
                                    type: "string",
                                    description: "The name of the item to add (e.g., 'Ceiling Fan', 'VTPN', 'Socket')"
                                },
                                x: {
                                    type: "number",
                                    description: "Optional: X position on canvas. Defaults to 300."
                                },
                                y: {
                                    type: "number",
                                    description: "Optional: Y position on canvas. Defaults to 300."
                                }
                            },
                            required: ["itemName"]
                        }
                    },
                    {
                        name: "delete_item_from_diagram",
                        description: "Delete an item from the diagram. You can specify either the item ID or the item name. If using name, it deletes the first match found.",
                        parameters: {
                            type: "object",
                            properties: {
                                itemId: {
                                    type: "string",
                                    description: "The unique ID of the item (first 8 characters are usually enough)"
                                },
                                itemName: {
                                    type: "string",
                                    description: "The name of the item to delete (e.g., 'Ceiling Fan')"
                                }
                            }
                        }
                    }
                ]
            }
        ];

        const payload = {
            contents,
            system_instruction: systemInstruction,
            tools: tools
        };

        const response = await axios.post(
            `${baseUrl}?key=${apiKey}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    }
}

export const chatService = new ChatService();
