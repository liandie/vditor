import {formatRender} from "../editor/formatRender";
import {getSelectPosition} from "../editor/getSelectPosition";
import {getSelectText} from "../editor/getSelectText";
import {insertText} from "../editor/insertText";
import {setSelectionFocus} from "../editor/setSelection";
import {getCursorPosition} from "../hint/getCursorPosition";
import {getText} from "../util/getText";
import {getCurrentLinePosition} from "./getCurrentLinePosition";
import {hasClosestByAttribute, hasClosestByMatchTag} from "./hasClosest";

export const focusEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("focus", () => {
        if (vditor.options.focus) {
            vditor.options.focus(getText(vditor));
        }
        if (vditor.toolbar.elements.emoji && vditor.toolbar.elements.emoji.children[1]) {
            const emojiPanel = vditor.toolbar.elements.emoji.children[1] as HTMLElement;
            emojiPanel.style.display = "none";
        }
        if (vditor.toolbar.elements.headings && vditor.toolbar.elements.headings.children[1]) {
            const headingsPanel = vditor.toolbar.elements.headings.children[1] as HTMLElement;
            headingsPanel.style.display = "none";
        }
    });

};

export const scrollCenter = (editorElement: HTMLElement) => {
    const cursorTop = getCursorPosition(editorElement).top;
    const center = editorElement.clientHeight / 2;
    if (cursorTop > center) {
        editorElement.scrollTop = editorElement.scrollTop + (cursorTop - center);
    }
};

export const hotkeyEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    const processKeymap = (hotkey: string, event: KeyboardEvent, action: () => void) => {
        const hotkeys = hotkey.split("-");
        const hasShift = hotkeys.length === 3 && (hotkeys[1] === "shift" || hotkeys[1] === "⇧");
        const key = hasShift ? hotkeys[2] : hotkeys[1];
        if ((hotkeys[0] === "ctrl" || hotkeys[0] === "⌘") && (event.metaKey || event.ctrlKey)
            && event.key.toLowerCase() === key.toLowerCase()) {
            if ((!hasShift && !event.shiftKey) || (hasShift && event.shiftKey)) {
                action();
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };

    const hint = (event: KeyboardEvent, hintElement: HTMLElement) => {
        if (!hintElement) {
            return;
        }

        if (hintElement.querySelectorAll("button").length === 0 ||
            hintElement.style.display === "none") {
            return;
        }

        const currentHintElement: HTMLElement = hintElement.querySelector(".vditor-hint--current");

        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            if (!currentHintElement.nextElementSibling) {
                hintElement.children[0].className = "vditor-hint--current";
            } else {
                currentHintElement.nextElementSibling.className = "vditor-hint--current";
            }
            currentHintElement.removeAttribute("class");
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            if (!currentHintElement.previousElementSibling) {
                const length = hintElement.children.length;
                hintElement.children[length - 1].className = "vditor-hint--current";
            } else {
                currentHintElement.previousElementSibling.className = "vditor-hint--current";
            }
            currentHintElement.removeAttribute("class");
        } else if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            vditor.hint.fillEmoji(currentHintElement, vditor);
        }
    };

    editorElement.addEventListener("keydown", (event: KeyboardEvent & { target: HTMLElement }) => {
        if (event.target.tagName === "INPUT") {
            return;
        }
        const hintElement = vditor.hint && vditor.hint.element;

        vditor.undo.recordFirstPosition(vditor);

        if ((event.metaKey || event.ctrlKey) && vditor.options.ctrlEnter && event.key === "Enter") {
            vditor.options.ctrlEnter(getText(vditor));
            return;
        }

        if (event.key === "Escape") {
            if (vditor.options.esc) {
                vditor.options.esc(getText(vditor));
            }
            if (hintElement && hintElement.style.display === "block") {
                hintElement.style.display = "none";
            }
            return;
        }

        // tab
        if (vditor.options.tab && event.key === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            if (vditor.currentMode === "wysiwyg") {
                if (event.shiftKey) {
                    document.execCommand("outdent", false);
                } else {
                    document.execCommand("indent", false);
                }
                return;
            }

            const position = getSelectPosition(editorElement);
            const text = getText(vditor);
            const selectLinePosition = getCurrentLinePosition(position, text);
            const selectLineList = text.substring(selectLinePosition.start, selectLinePosition.end - 1).split("\n");

            if (event.shiftKey) {
                let shiftCount = 0;
                let startIsShift = false;
                const selectionShiftResult = selectLineList.map((value, index) => {
                    let shiftLineValue = value;
                    if (value.indexOf(vditor.options.tab) === 0) {
                        if (index === 0) {
                            startIsShift = true;
                        }
                        shiftCount++;
                        shiftLineValue = value.replace(vditor.options.tab, "");
                    }
                    return shiftLineValue;
                }).join("\n");

                formatRender(vditor, text.substring(0, selectLinePosition.start) +
                    selectionShiftResult + text.substring(selectLinePosition.end - 1),
                    {
                        end: position.end - shiftCount * vditor.options.tab.length,
                        start: position.start - (startIsShift ? vditor.options.tab.length : 0),
                    });
                return;
            }

            if (position.start === position.end) {
                insertText(vditor, vditor.options.tab, "");
                return;
            }
            const selectionResult = selectLineList.map((value) => {
                return vditor.options.tab + value;
            }).join("\n");
            formatRender(vditor, text.substring(0, selectLinePosition.start) + selectionResult +
                text.substring(selectLinePosition.end - 1),
                {
                    end: position.end + selectLineList.length * vditor.options.tab.length,
                    start: position.start + vditor.options.tab.length,
                });
            return;
        }

        // delete
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.keyCode === 8) {
            if (vditor.currentMode === "markdown") {
                const position = getSelectPosition(editorElement);
                if (position.start !== position.end) {
                    insertText(vditor, "", "", true);
                } else {
                    // delete emoji
                    const text = getText(vditor);
                    const emojiMatch = text.substring(0, position.start).match(/([\u{1F300}-\u{1F5FF}][\u{2000}-\u{206F}][\u{2700}-\u{27BF}]|([\u{1F900}-\u{1F9FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F600}-\u{1F64F}])[\u{2000}-\u{206F}][\u{2600}-\u{26FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F000}-\u{1F02F}]|[\u{FE00}-\u{FE0F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{0000}-\u{007F}][\u{20D0}-\u{20FF}]|[\u{0000}-\u{007F}][\u{FE00}-\u{FE0F}][\u{20D0}-\u{20FF}])$/u);
                    const deleteChar = emojiMatch ? emojiMatch[0].length : 1;
                    formatRender(vditor,
                        text.substring(0, position.start - deleteChar) + text.substring(position.start),
                        {
                            end: position.start - deleteChar,
                            start: position.start - deleteChar,
                        });
                }
                event.preventDefault();
                event.stopPropagation();
            } else {
                const range = getSelection().getRangeAt(0);
                const startContainer = range.startContainer as HTMLElement;

                if (startContainer.nodeType === 3 && range.startOffset === 0) {
                    // 光标位于第零个位置进行删除
                    if (startContainer.parentElement.tagName === "CODE" &&
                        startContainer.parentElement.parentElement.parentElement.classList
                            .contains("vditor-wysiwyg__block") && !startContainer.previousSibling) {
                        // 光标位于渲染代码块内，仅删除代码块，内容保持不变
                        const text = document.createTextNode(startContainer.parentElement.textContent);
                        range.setStartBefore(startContainer.parentElement.parentElement.parentElement);
                        range.insertNode(text);
                        range.collapse(true);
                        (vditor.wysiwyg.popover.firstElementChild as HTMLElement).click();
                        event.preventDefault();
                        return;
                    }

                    const blockquoteElement = hasClosestByMatchTag(startContainer, "BLOCKQUOTE");
                    if (blockquoteElement) {
                        // 光标位于引用中的第零个字符
                        blockquoteElement.outerHTML = `<p data-block="0">${blockquoteElement.innerHTML}</p>`;
                        event.preventDefault();
                        return;
                    }

                    const liElement = hasClosestByMatchTag(startContainer, "LI");
                    const blockElement = hasClosestByAttribute(startContainer, "data-block", "0");
                    if (blockElement) {
                        const blockRenderElement = blockElement.previousElementSibling as HTMLElement;
                        if (blockRenderElement && blockRenderElement.classList.contains("vditor-wysiwyg__block") &&
                            blockElement.tagName !== "TABLE" &&
                            (!liElement ||
                                (liElement && liElement.isEqualNode(liElement.parentElement.firstElementChild)))) {
                            // 删除后光标落在代码渲染块的预览部分且光标后有内容
                            (blockRenderElement.lastElementChild as HTMLElement).click();
                            event.preventDefault();
                        }
                    }
                } else if (startContainer.nodeType !== 3) {
                    // 光标位于 table 前，table 前有内容
                    const tableElemnt = startContainer.childNodes[range.startOffset] as HTMLElement;
                    if (tableElemnt && range.startOffset > 0 &&
                        tableElemnt.tagName === "TABLE") {
                        range.selectNodeContents(tableElemnt.previousElementSibling);
                        range.collapse(false);
                        setSelectionFocus(range);
                        event.preventDefault();
                        return;
                    }

                    // 段落前为代码渲染块，从段落中间开始删除，一直删除头再继续删除一次
                    if (range.startOffset === 0 && startContainer.tagName === "P") {
                        const pPrevElement = startContainer.previousElementSibling;
                        if (pPrevElement && pPrevElement.classList.contains("vditor-wysiwyg__block")) {
                            (pPrevElement.lastElementChild as HTMLElement).click();
                            event.preventDefault();
                        }
                        return;
                    }

                    // 渲染代码块为空
                    if (startContainer.tagName === "CODE" &&
                        startContainer.textContent === "" &&
                        startContainer.parentElement.parentElement.classList.contains("vditor-wysiwyg__block")) {
                        startContainer.parentElement.parentElement.outerHTML = '<p data-block="0">\n</p>';
                        event.preventDefault();
                        return;
                    }

                    const preElement = startContainer.childNodes[range.startOffset - 1] as HTMLElement;
                    if (preElement && preElement.nodeType !== 3 &&
                        preElement.classList.contains("vditor-wysiwyg__block")) {
                        // 光标从代码块向后移动到下一个段落前，进行删除
                        (preElement.querySelector(".vditor-wysiwyg__preview") as HTMLElement).click();
                        event.preventDefault();
                    }
                }
            }
            return;
        }

        // hotkey command + delete
        if (vditor.options.keymap.deleteLine && vditor.currentMode === "markdown") {
            processKeymap(vditor.options.keymap.deleteLine, event, () => {
                const position = getSelectPosition(editorElement);
                const text = getText(vditor);
                const linePosition = getCurrentLinePosition(position, text);
                const deletedText = text.substring(0, linePosition.start) + text.substring(linePosition.end);
                const startIndex = Math.min(deletedText.length, position.start);
                formatRender(vditor, deletedText, {
                    end: startIndex,
                    start: startIndex,
                });
            });
        }

        // hotkey command + d
        if (vditor.options.keymap.duplicate && vditor.currentMode === "markdown") {
            processKeymap(vditor.options.keymap.duplicate, event, () => {
                const position = getSelectPosition(editorElement);
                const text = getText(vditor);
                let lineText = text.substring(position.start, position.end);
                if (position.start === position.end) {
                    const linePosition = getCurrentLinePosition(position, text);
                    lineText = text.substring(linePosition.start, linePosition.end);
                    formatRender(vditor,
                        text.substring(0, linePosition.end) + lineText + text.substring(linePosition.end),
                        {
                            end: position.end + lineText.length,
                            start: position.start + lineText.length,
                        });
                } else {
                    formatRender(vditor,
                        text.substring(0, position.end) + lineText + text.substring(position.end),
                        {
                            end: position.end + lineText.length,
                            start: position.start + lineText.length,
                        });
                }
            });
        }

        // toolbar action
        vditor.options.toolbar.forEach((menuItem: IMenuItem) => {
            if (!menuItem.hotkey) {
                return;
            }
            processKeymap(menuItem.hotkey, event, () => {
                (vditor.toolbar.elements[menuItem.name].children[0] as HTMLElement).click();
            });
        });

        // undo
        if (!vditor.toolbar.elements.undo && (event.metaKey || event.ctrlKey) && event.key === "z") {
            if (vditor.currentMode === "markdown") {
                vditor.undo.undo(vditor);
            } else {
                vditor.wysiwygUndo.undo(vditor);
            }
            event.preventDefault();
        }

        // redo
        if (!vditor.toolbar.elements.redo && (event.metaKey || event.ctrlKey) && event.key === "y") {
            if (vditor.currentMode === "markdown") {
                vditor.undo.redo(vditor);
            } else {
                vditor.wysiwygUndo.redo(vditor);
            }
            event.preventDefault();
        }

        // hint: 上下选择
        if (vditor.options.hint.at || vditor.toolbar.elements.emoji) {
            hint(event, hintElement);
        }
    });
};

export const selectEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    if (!vditor.options.select) {
        return;
    }
    editorElement.addEventListener("selectstart", (event: IHTMLInputEvent) => {
        if (event.target.tagName === "INPUT") {
            return;
        }
        editorElement.onmouseup = () => {
            const element = vditor.currentMode === "wysiwyg" ?
                vditor.wysiwyg.element : vditor.editor.element;
            const selectText = getSelectText(element);
            vditor.options.select(selectText);
        };
    });
};
