import { CanvasItem } from '../types';

export const updateItemVisuals = (item: CanvasItem): string => {
    if (!item.svgContent) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(item.svgContent, "image/svg+xml");
    let modified = false;

    switch (item.name) {
        case "Bulb":
        case "Tube Light":
        case "Ceiling Fan":
        case "Exhaust Fan":
        case "Split AC":
        case "Geyser":
        case "Call Bell":
            modified = updateSimpleItemVisuals(doc, item);
            break;
        case "Point Switch Board":
        case "Avg. 5A Switch Board":
            modified = updateSwitchBoardVisuals(doc, item);
            break;
        case "Change Over Switch":
        case "Main Switch":
            modified = updateSwitchVisuals(doc, item);
            break;
        case "VTPN":
        case "SPN DB":
        case "HTPN":
            modified = updateDistributionBoardVisuals(doc, item);
            break;
        case "LT Cubical Panel":
            modified = updateCubiclePanelVisuals(doc, item);
            break;
        case "Source":
            modified = updateSourceVisuals(doc, item);
            break;
    }

    if (modified) {
        return new XMLSerializer().serializeToString(doc);
    }
    return item.svgContent;
};

const updateSimpleItemVisuals = (doc: Document, item: CanvasItem): boolean => {
    const power = item.properties[0]?.["Power"];
    if (power) {
        // Try finding common IDs for power text
        const ids = ["text1", "powerText", "Rating"];
        for (const id of ids) {
            const el = doc.getElementById(id);
            if (el) {
                el.textContent = power;
                return true;
            }
        }
    }
    return false;
};

const updateSwitchBoardVisuals = (doc: Document, item: CanvasItem): boolean => {
    let modified = false;
    const avgRun = item.properties[0]?.["Avg. Run"];
    const type = item.properties[0]?.["Type"];

    if (avgRun) {
        const el = doc.getElementById("avgRunText");
        if (el) {
            // Match C# format: "Avg.Run: 10M"
            const numericPart = avgRun.match(/(\d+\.?\d*)/)?.[0] || "0";
            el.textContent = `Avg.Run: ${numericPart}M`;
            modified = true;
        }
    }

    if (type) {
        const el = doc.getElementById("Type");
        if (el) {
            el.textContent = type;
            modified = true;
        }
    }

    // Update Orboard text
    const accessories = item.accessories?.[0];
    if (accessories) {
        let numberOfOnboard = "0";
        const orboardRequired = accessories["orboard_required"];

        if (orboardRequired && orboardRequired.toLowerCase() === "true") {
            numberOfOnboard = accessories["number_of_onboard"] || "1";
        }

        const el = doc.getElementById("orboard");
        if (el) {
            el.textContent = `OB = ${numberOfOnboard}`;
            modified = true;
        }
    }

    return modified;
};

const updateSwitchVisuals = (doc: Document, item: CanvasItem): boolean => {
    let modified = false;
    const rating = item.properties[0]?.["Current Rating"];
    const voltage = item.properties[0]?.["Voltage"];

    if (rating) {
        const el = doc.getElementById("Rating");
        if (el) {
            el.textContent = rating;
            modified = true;
        }
    }

    if (voltage) {
        const el = doc.getElementById("text1");
        if (el) {
            // C# logic: $"C/O {VoltageText.Replace(" ", "")}" or $"MS ..."
            const prefix = item.name === "Main Switch" ? "MS" : "C/O";
            el.textContent = `${prefix} ${voltage.replace(/\s/g, "")}`;
            modified = true;
        }
    }

    return modified;
};

const updateDistributionBoardVisuals = (doc: Document, item: CanvasItem): boolean => {
    let modified = false;
    const wayText = item.properties[0]?.["Way"];
    const incomerRating = item.incomer?.["Current Rating"];

    console.log(`[SvgUpdater] Updating DB: ${item.name}, Way: ${wayText}, Incomer: ${incomerRating}`);

    if (!wayText) {
        console.warn(`[SvgUpdater] Missing Way property.`);
        return false;
    }

    let way = 0;
    if (item.name === "SPN DB") {
        // Use capturing group instead of lookbehind for better compatibility
        const match = wayText.match(/2\+(\d+)/);
        way = match ? parseInt(match[1]) : 4;
        console.log(`[SvgUpdater] SPN DB Way parsed: ${way} from ${wayText}`);
    } else {
        const match = wayText.match(/\d+/);
        way = match ? parseInt(match[0]) : 4;
    }

    const svg = doc.documentElement;
    let width = 0;

    // Calculate Width based on type
    if (item.name === "HTPN") width = 56 * way * 3;
    else if (item.name === "VTPN") width = 70 * way;
    else if (item.name === "SPN DB") width = 60 * way;

    if (width > 0) {
        svg.setAttribute("width", width.toString());
        modified = true;
    }

    // Update Nameplate
    const nameplate = doc.querySelector("#nameplate");
    if (nameplate) {
        let suffix = item.name;
        let displayText = `${wayText} ${suffix}`;
        if (item.name === "VTPN") displayText = `${way} Way VTPN DB`;
        if (item.name === "HTPN") displayText = `${wayText} HTPN DB`;
        if (item.name === "SPN DB") displayText = `${wayText} SPN DB`;
        nameplate.textContent = displayText;
        modified = true;
    } else {
        console.warn(`[SvgUpdater] Element '#nameplate' not found.`);
    }

    // Update Incomer Text
    if (incomerRating) {
        const incomingtext1 = doc.querySelector("#incomingtext1");
        if (incomingtext1) {
            incomingtext1.textContent = incomerRating;
            modified = true;
        }
    }

    // Update Border Width
    const border = doc.querySelector("#border");
    if (border) {
        let borderWidth = 0;
        if (item.name === "HTPN") borderWidth = 56 * way * 0.99 * 3;
        else if (item.name === "VTPN") borderWidth = 70 * way * 0.99;
        else if (item.name === "SPN DB") borderWidth = 60 * way * 0.98;

        border.setAttribute("width", borderWidth.toString());
        modified = true;
    }

    // Update Incoming Group Position
    const incoming = doc.querySelector("#incoming");
    if (incoming) {
        incoming.setAttribute("transform", `translate(${width / 2}, 50)`);
        modified = true;
    }

    // Update Busbar Length
    const busbar = doc.querySelector("#Busbar");
    if (busbar) {
        let endX = 0;
        if (item.name === "HTPN") endX = (51 + (way - 1) * 55) * 3;
        else if (item.name === "VTPN") endX = 52 + ((way - 1) * 65);
        else if (item.name === "SPN DB") endX = 42 + ((way - 1) * 55);

        busbar.setAttribute("x2", endX.toString());
        modified = true;
    }

    // Update Outgoing Circuits
    const outgoingGroup = doc.querySelector("#outgoing-group");
    if (outgoingGroup) {
        // Clear existing children
        while (outgoingGroup.firstChild) {
            outgoingGroup.removeChild(outgoingGroup.firstChild);
        }

        if (item.name === "HTPN") {
            let j = 0;
            ["R", "Y", "B"].forEach(phase => {
                for (let i = 1; i <= way; i++) {
                    const rating = item.outgoing[j]?.["Current Rating"] || "";
                    const newGroup = createOutgoingGroup(doc, `${phase}${i}`, rating);
                    newGroup.setAttribute("transform", `translate(${40 + j * 55}, 130)`);
                    outgoingGroup.appendChild(newGroup);
                    j++;
                }
            });
        } else if (item.name === "VTPN") {
            for (let i = 1; i <= way; i++) {
                const rating = item.outgoing[i - 1]?.["Current Rating"] || "";
                const newGroup = createOutgoingGroup(doc, `OG${i}`, rating, "TP");
                newGroup.setAttribute("transform", `translate(${50 + (i - 1) * 65}, 130)`);
                outgoingGroup.appendChild(newGroup);
            }
        } else if (item.name === "SPN DB") {
            for (let i = 1; i <= way; i++) {
                const rating = item.outgoing[i - 1]?.["Current Rating"] || "";
                const newGroup = createOutgoingGroup(doc, `OG${i}`, rating, "SP");
                newGroup.setAttribute("transform", `translate(${40 + (i - 1) * 55}, 130)`);
                outgoingGroup.appendChild(newGroup);
            }
        }
        modified = true;
    } else {
        console.warn(`[SvgUpdater] Element '#outgoing-group' not found.`);
    }

    return modified;
};

const createOutgoingGroup = (doc: Document, id: string, rating: string, pole: string = "SP"): SVGElement => {
    const ns = "http://www.w3.org/2000/svg";
    const group = doc.createElementNS(ns, "g");
    group.setAttribute("id", id);

    // Lines
    const line1 = doc.createElementNS(ns, "line");
    line1.setAttribute("x1", "0"); line1.setAttribute("y1", "-49");
    line1.setAttribute("x2", "0"); line1.setAttribute("y2", "-20");
    line1.setAttribute("stroke", "black"); line1.setAttribute("stroke-width", "3");
    group.appendChild(line1);

    const line2 = doc.createElementNS(ns, "line");
    line2.setAttribute("x1", "12"); line2.setAttribute("y1", "-18");
    line2.setAttribute("x2", "0"); line2.setAttribute("y2", "0");
    line2.setAttribute("stroke", "black"); line2.setAttribute("stroke-width", "3");
    group.appendChild(line2);

    const line3 = doc.createElementNS(ns, "line");
    line3.setAttribute("x1", "0"); line3.setAttribute("y1", "-2");
    line3.setAttribute("x2", "0"); line3.setAttribute("y2", "32");
    line3.setAttribute("stroke", "black"); line3.setAttribute("stroke-width", "3");
    group.appendChild(line3);

    // Texts
    const createText = (text: string, y: string) => {
        const t = doc.createElementNS(ns, "text");
        t.textContent = text;
        t.setAttribute("x", "-35");
        t.setAttribute("y", y);
        t.setAttribute("font-size", "11"); // Or 12 based on C#
        t.setAttribute("font-family", "Arial");
        t.setAttribute("fill", "black");
        return t;
    };

    group.appendChild(createText(id, "-34"));
    group.appendChild(createText(rating, "-22"));
    group.appendChild(createText(pole, "-9"));
    group.appendChild(createText("MCB", "4"));

    return group;
};

import { PanelRenderer } from './PanelRenderer';

// ...

const updateCubiclePanelVisuals = (doc: Document, item: CanvasItem): boolean => {
    const newSvgString = PanelRenderer.generateSvg(item);
    // Parse the new SVG and replace the document content
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(newSvgString, "image/svg+xml");

    // Replace the root element attributes and content
    const oldRoot = doc.documentElement;
    const newRoot = newDoc.documentElement;

    // Copy attributes
    for (let i = 0; i < newRoot.attributes.length; i++) {
        const attr = newRoot.attributes[i];
        oldRoot.setAttribute(attr.name, attr.value);
    }

    // Replace content
    while (oldRoot.firstChild) {
        oldRoot.removeChild(oldRoot.firstChild);
    }
    while (newRoot.firstChild) {
        oldRoot.appendChild(newRoot.firstChild);
    }

    return true;
};

const updateSourceVisuals = (doc: Document, item: CanvasItem): boolean => {
    let modified = false;

    // Update Type (3-phase or 1-phase text)
    const type = item.properties[0]?.["Type"];
    if (type) {
        // The Source SVG has a text element with id="Rating" that shows "3-phase" or "1-phase"
        const phaseTexts = doc.querySelectorAll('text');
        phaseTexts.forEach(el => {
            if (el.textContent === "3-phase" || el.textContent === "1-phase") {
                el.textContent = type;
                modified = true;
            }
        });
    }

    // Update Capacity if provided
    const capacity = item.properties[0]?.["Capacity"];
    if (capacity) {
        const el = doc.getElementById("text1");
        if (el) {
            el.textContent = capacity;
            modified = true;
        }
    }

    return modified;
};
