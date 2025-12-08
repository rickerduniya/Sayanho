import React, { useState, useRef, useEffect } from 'react';
import { Text, Group, Rect, Transformer } from 'react-konva';
import { CanvasItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface TextComponentProps {
    item: CanvasItem;
    isSelected: boolean;
    onSelect: (e?: any) => void;
    onDragEnd: (x: number, y: number) => void;
    onDragMove?: (x: number, y: number) => void;
    onDragStart?: (e?: any) => void;
    onDoubleClick?: () => void;
    onTextChange?: (text: string) => void;
    onTransformEnd?: (x: number, y: number, width: number, height: number, rotation: number) => void;
    panMode?: boolean;
    scale?: number;
    onContextMenu?: (x: number, y: number) => void;
}

export const TextComponent: React.FC<TextComponentProps> = ({
    item,
    isSelected,
    onSelect,
    onDragEnd,
    onDragMove,
    onDragStart,
    onDoubleClick,
    onTextChange,
    onTransformEnd,
    panMode,
    scale = 1,
    onContextMenu
}) => {
    const { theme, colors } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const textRef = useRef<any>(null);
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    // Get text properties
    const text = item.properties[0]?.["Text"] || "Double-click to edit";
    const fontSize = parseInt(item.properties[0]?.["FontSize"] || "16");
    const fontFamily = item.properties[0]?.["FontFamily"] || "Arial";
    // Resolve color: if "default" or missing, use theme color
    const savedColor = item.properties[0]?.["Color"];
    const color = (savedColor === "default" || !savedColor)
        ? (theme === 'dark' ? '#FFFFFF' : '#000000')
        : savedColor;
    const align = item.properties[0]?.["Align"] || "left";
    const rotation = item.rotation || 0;

    // Get style properties
    const isBold = item.properties[0]?.["Bold"] === "true";
    const isItalic = item.properties[0]?.["Italic"] === "true";
    const isUnderline = item.properties[0]?.["Underline"] === "true";
    const isStrikethrough = item.properties[0]?.["Strikethrough"] === "true";

    // Build Konva fontStyle (normal, bold, italic, italic bold)
    const fontStyle = isBold && isItalic ? "italic bold" : isBold ? "bold" : isItalic ? "italic" : "normal";

    // Build Konva textDecoration (none, underline, line-through, underline line-through)
    const textDecoration = isUnderline && isStrikethrough ? "underline line-through" : isUnderline ? "underline" : isStrikethrough ? "line-through" : "";

    // Attach transformer when selected
    useEffect(() => {
        if (isSelected && trRef.current && groupRef.current) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    // Calculate text dimensions
    const padding = 8;
    const minWidth = 100;
    const minHeight = 30;

    const handleDoubleClick = () => {
        if (!panMode) {
            setEditText(text);
            setIsEditing(true);
            onDoubleClick?.();
        }
    };

    const handleTextEdit = (value: string) => {
        if (value.trim() !== text) {
            onTextChange?.(value.trim() || "Double-click to edit");
        }
        setIsEditing(false);
    };

    // Render HTML input overlay when editing
    // Render HTML input overlay when editing
    useEffect(() => {
        if (isEditing && groupRef.current) {
            const stage = groupRef.current.getStage();

            // Get absolute position of the group to handle zoom and pan correctly
            const absPos = groupRef.current.getAbsolutePosition();
            const stageBox = stage.container().getBoundingClientRect();

            // Create textarea overlay
            const textarea = document.createElement('textarea');
            textarea.value = editText;
            textarea.style.position = 'absolute';
            textarea.style.left = `${stageBox.left + absPos.x}px`;
            textarea.style.top = `${stageBox.top + absPos.y}px`;

            // Calculate width/height based on scale
            textarea.style.width = `${Math.max(item.size.width, minWidth) * scale}px`;
            textarea.style.minHeight = `${Math.max(item.size.height, minHeight) * scale}px`;
            textarea.style.fontSize = `${fontSize * scale}px`;
            textarea.style.fontFamily = fontFamily;
            textarea.style.color = color;
            textarea.style.textAlign = align as any;
            textarea.style.padding = `${padding * scale}px`;
            textarea.style.border = '2px solid #4f46e5';
            textarea.style.borderRadius = '4px';
            textarea.style.outline = 'none';
            textarea.style.resize = 'none';
            textarea.style.background = 'transparent'; // Transparent to blend with canvas
            textarea.style.caretColor = color; // Caret matches text color
            textarea.style.zIndex = '1000';
            textarea.style.lineHeight = '1.4';

            // Apply text styles
            textarea.style.fontWeight = isBold ? 'bold' : 'normal';
            textarea.style.fontStyle = isItalic ? 'italic' : 'normal';
            const decorations = [];
            if (isUnderline) decorations.push('underline');
            if (isStrikethrough) decorations.push('line-through');
            textarea.style.textDecoration = decorations.join(' ');

            // Handle rotation for the textarea
            textarea.style.transform = `rotate(${rotation}deg)`;
            textarea.style.transformOrigin = 'top left';

            document.body.appendChild(textarea);
            textarea.focus();
            // textarea.select(); // Optional: Select all on open? Maybe better not to if re-rendering.

            const handleInput = (e: Event) => {
                const val = (e.target as HTMLTextAreaElement).value;
                setEditText(val);
            };

            const handleBlur = () => {
                const val = textarea.value;
                setEditText(val);
                if (document.body.contains(textarea)) {
                    document.body.removeChild(textarea);
                }
                handleTextEdit(val);
            };

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setEditText(text); // Revert changes
                    if (document.body.contains(textarea)) {
                        document.body.removeChild(textarea);
                    }
                    setIsEditing(false);
                }
                // Don't close on Enter for multi-line text
            };

            textarea.addEventListener('input', handleInput);
            textarea.addEventListener('blur', handleBlur);
            textarea.addEventListener('keydown', handleKeyDown);

            return () => {
                if (document.body.contains(textarea)) {
                    textarea.removeEventListener('input', handleInput);
                    textarea.removeEventListener('blur', handleBlur);
                    textarea.removeEventListener('keydown', handleKeyDown);
                    document.body.removeChild(textarea);
                }
            };
        }
    }, [isEditing, scale, theme, color, fontSize, fontFamily, align, rotation, isBold, isItalic, isUnderline, isStrikethrough]);

    return (
        <>
            <Group
                ref={groupRef}
                x={item.position.x}
                y={item.position.y}
                width={item.size.width}
                height={item.size.height}
                rotation={rotation}
                draggable={!item.locked && !panMode && !isEditing}
                onDragStart={onDragStart}
                onDragMove={(e) => onDragMove?.(e.target.x(), e.target.y())}
                onDragEnd={(e) => {
                    onDragEnd(e.target.x(), e.target.y());
                }}
                onTransformEnd={(e) => {
                    const node = groupRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // Reset scale to 1 and update width/height
                    node.scaleX(1);
                    node.scaleY(1);

                    onTransformEnd?.(
                        node.x(),
                        node.y(),
                        Math.max(5, node.width() * scaleX),
                        Math.max(5, node.height() * scaleY),
                        node.rotation()
                    );
                }}
                onClick={(e) => {
                    if (e.evt.button === 0 && !isEditing) {
                        onSelect(e);
                    }
                }}
                onTap={onSelect}
                onDblClick={handleDoubleClick}
                onDblTap={handleDoubleClick}
                onContextMenu={(e) => {
                    e.evt.preventDefault(); // Prevent default browser context menu
                    // Get the absolute pointer position from the stage
                    const stage = e.target.getStage();
                    const pointerPosition = stage?.getPointerPosition();
                    if (pointerPosition) {
                        // Pass the raw pointer position (client coordinates would be even better if we had them, 
                        // but Konva gives us stage coordinates. The parent expects client-like coordinates relative to container?
                        // Let's look at ItemComponent usage.
                        // ItemComponent onContextMenu receives (cx, cy).
                        // In ItemComponent, it is called as `onContextMenu(e.evt.clientX, e.evt.clientY)`.
                        // So we should pass clientX and clientY.
                        onContextMenu?.(e.evt.clientX, e.evt.clientY);
                    }
                }}
            >
                {/* Selection highlight */}
                {isSelected && !isEditing && (
                    <Rect
                        x={-4}
                        y={-4}
                        width={Math.max(item.size.width, minWidth) + 8}
                        height={Math.max(item.size.height, minHeight) + 8}
                        fill="transparent"
                        stroke="#4f46e5"
                        strokeWidth={2 / scale}
                        dash={[8 / scale, 4 / scale]}
                    />
                )}

                {/* Background for better visibility */}
                <Rect
                    width={Math.max(item.size.width, minWidth)}
                    height={Math.max(item.size.height, minHeight)}
                    fill="transparent"
                    stroke={isSelected ? "#4f46e5" : "transparent"}
                    strokeWidth={isSelected ? 1 / scale : 0}
                />

                {/* Text */}
                {!isEditing && (
                    <Text
                        ref={textRef}
                        text={text}
                        fontSize={fontSize}
                        fontFamily={fontFamily}
                        fontStyle={fontStyle}
                        textDecoration={textDecoration}
                        fill={color}
                        align={align}
                        width={Math.max(item.size.width, minWidth)}
                        padding={padding}
                        lineHeight={1.4}
                        listening={false}
                    />
                )}
            </Group>
            {/* Transformer */}
            {isSelected && !isEditing && !panMode && (
                <Transformer
                    ref={trRef}
                    enabledAnchors={['middle-left', 'middle-right', 'top-center', 'bottom-center']}
                    rotationSnaps={[0, 90, 180, 270]}
                    boundBoxFunc={(oldBox, newBox) => {
                        // Limit minimum width
                        if (newBox.width < 50) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};
