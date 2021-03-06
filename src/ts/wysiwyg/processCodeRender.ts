import {setSelectionFocus} from "../editor/setSelection";
import {abcRender} from "../markdown/abcRender";
import {chartRender} from "../markdown/chartRender";
import {codeRender} from "../markdown/codeRender";
import {highlightRender} from "../markdown/highlightRender";
import {mathRenderByLute} from "../markdown/mathRenderByLute";
import {mermaidRender} from "../markdown/mermaidRender";

// html, math, math-inline, code block, abc, chart, mermaid
export const processCodeRender = (blockElement: HTMLElement, vditor: IVditor) => {
    const blockType = blockElement.getAttribute("data-type");
    if (!blockType) {
        return;
    }
    const tagName = blockType.indexOf("block") > -1 ? "div" : "span";
    let previewPanel: HTMLElement = blockElement.querySelector(".vditor-wysiwyg__preview");
    if (!previewPanel) {
        blockElement.insertAdjacentHTML("beforeend", `<${tagName} class="vditor-wysiwyg__preview"></${tagName}>`);
        previewPanel = blockElement.querySelector(".vditor-wysiwyg__preview");
        previewPanel.setAttribute("data-render", "false");
        const showCode = () => {
            const range = preElement.ownerDocument.createRange();
            if (preElement.getAttribute("data-type") === "math-inline") {
                preElement.style.display = "inline";
                range.selectNodeContents(preElement);
            } else {
                preElement.style.display = "block";
                if (!preElement.firstElementChild.firstChild) {
                    preElement.firstElementChild.appendChild(document.createTextNode(""));
                }
                range.setStart(preElement.firstElementChild.firstChild, 0);
            }
            range.collapse(true);
            setSelectionFocus(range);
        };
        previewPanel.addEventListener("click", () => {
            showCode();
        });
    }

    const preElement = previewPanel.previousElementSibling as HTMLElement;
    const innerHTML = decodeURIComponent(blockElement.querySelector("code").getAttribute("data-code") || "");
    if (blockType === "code-block") {
        const language = preElement.querySelector("code").className.replace("language-", "");
        previewPanel.innerHTML = `<pre><code>${innerHTML}</code></pre>`;
        if (language === "abc") {
            abcRender(previewPanel, vditor.options.cdn);
        } else if (language === "mermaid") {
            mermaidRender(previewPanel, ".vditor-wysiwyg__preview .language-mermaid",
                vditor.options.cdn);
        } else if (language === "echarts") {
            chartRender(previewPanel, vditor.options.cdn);
        } else {
            highlightRender(vditor.options.preview.hljs, previewPanel, vditor.options.cdn);
            codeRender(previewPanel, vditor.options.lang);
        }
    } else if (blockType.indexOf("html") > -1) {
        previewPanel.innerHTML = innerHTML;
    } else if (blockType.indexOf("math") > -1) {
        previewPanel.innerHTML = `<${tagName} class="vditor-math">${innerHTML}</${tagName}>`;
        mathRenderByLute(previewPanel, vditor.options.cdn);
    }
};
