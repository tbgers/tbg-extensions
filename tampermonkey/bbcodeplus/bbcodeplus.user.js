// ==UserScript==
// @name         BBCode+
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Enhances the BBCode parser. (parsing is done locally)
// @author       Gilbert189
// @match        *://tbgforums.com/forums/edit.php*
// @match        *://tbgforums.com/forums/search.php*
// @match        *://tbgforums.com/forums/post.php*
// @match        *://tbgforums.com/forums/viewtopic.php*
// @icon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const debug = true;
    const noIFrame = true;

    var escape = document.createElement('textarea');
    function escapeHTML(html) {
        escape.textContent = html;
        return escape.innerHTML;
    }
    /*
    function escape(s) {
        let lookup = {
            '&': "&amp;",
            '"': "&quot;",
            '\'': "&apos;",
            '<': "&lt;",
            '>': "&gt;"
        };
        return s.replace( /[&"'<>]/g, c => lookup[c] );
    }
    /**/

    const customCSS = `
    .pun table p {
        padding: 0 !important;
    }
    audio, video {
        max-width: 100%;
        object-fit: cover;
    }
    iframe {
        height: 300px;
        width: 300px;
        resize: both;
        overflow: auto;
    }
    `;

    let style = document.createElement("style");
    style.innerHTML = customCSS
    document.head.appendChild(style);

    const tagTypes = {
        "b": "b",
        "i": "i",
        "u": "u",
        "s": "s",
        "h": "h4",
        "del": "del",
        "em": "em",
        "ins": "ins",
        "c": "code",
        "quote": "div",
        "code": "div",
        "img": "img",
        "color": "span",
        "bgcolor": "span",
        "font": "span",
        "size": "span",
        "small": "span",
        "big": "span",
        "center": "span",
        "right": "span",
        "sup": "sup",
        "sub": "sub",
        "list": "ul",
        "*": "li",
        "url": "a",
        "img": "img",
        "post": "a",
        "topic": "a",
        "forum": "a",
        "user": "a",
        "email": "a",
        "marquee": "marquee",
        "table": "table",
        "-": "tr",
        "#": "th",
        "|": "td",
        "box": "div",
        "width": "div",
        "audio": "audio",
        "video": "video",
        "iframe": "iframe",
        "embed": "embed",
        "blink": "blink",
    }
    const textStyles = ["br", "b", "i", "u", "s", "code", "a", "del", "em", "span", "ins", "blink", "audio", "video", "iframe", "embed"];

    function blockToString(block, toBlock=true) {
        let content = "";
        if (block.type == "text") content = block.content;
        if (block.type == "tag") content = `[${block.ending===true?"/":""}${block.name}${block.data?"="+(/[\[\]]/.test(block.data)?'"'+block.data+'"':block.data):""}]${block.content.map(i=>blockToString(i, false)).join("")}${block.ending==="full"?"[/"+block.name+"]":""}`

        if (toBlock) return {type: "text", content};
        else return content;
    }

    const singletonTags = {"*": ["list"]};
    const rawTags = ["code"];

    function parse(text) {
        // This may be dumb
        if (debug) console.log("Phase -1", JSON.stringify(text));

        text = text.replace(/\[(.+?)(?:=[^\]]+?)?\]\[\/\1\]/g, "");
        if (debug) console.log("Phase 0", JSON.stringify(text));

        // Parse text into blocks
        let blocks = [];
        var temp = "";
        var layers = 0;
        for (var i of text) {
            if (i == "[" && layers != 2) {
                if (layers == 0) {
                    if (temp != "") blocks.push({type: "text", content: temp});
                    temp = "";
                }
                layers = 1;
            } else if (i == "]" && layers != 2) {
                layers = 0;
                if (layers == 0) {
                    let tag = temp.split("=", 2);
                    let ending = /^\//.test(tag[0]);
                        tag[0] = (tag[0] || "").replace(/^\//, "");
                    if (!(tag[0] in tagTypes)) { // invalid tag
                        blocks[blocks.length-1].content += `[${temp}]`;
                    } else {
                        blocks.push({type: "tag", name: tag[0], data: tag[1], ending, content: []});
                        temp = "";
                    }
                }
            } else if (i == '"') {
                if (layers == 1) layers = 2;
                else if (layers == 2) layers = 1;
            } else temp += i;
        }
        blocks.push({type: "text", content: temp});
        // Concatenate the last text blocks
        let concat = "";
        while (blocks.length > 0 ? blocks[blocks.length-1].type == "text" : false) {
            let a = blocks.pop();
            concat += a.content;
        }
        blocks.push({type: "text", content: concat});
        if (debug) console.log("Phase 1", blocks)

        // Merge tags or something
        var old = [];
        while (old != blocks) {
            var stack = [{type: "tag", name: "message", data: undefined, ending: false, content: []}];
            for (var i = 0; i < blocks.length; i++) {
                // console.error(JSON.stringify(stack, null, 2), blocks[i].name);
                if (blocks[i].type == "tag") {
                    let _ = stack.pop();
                    if (blocks[i].name == _.name) {
                        if (!(!blocks[i].ending || _.ending)) {
                            // special cases for raw tags
                            if (rawTags.includes(blocks[i].type))
                                blocks[i].content = blockToString(blocks[i]).match(/\[(.+?)(?:=[^\]]+?)?\]()\[\/\1\]/, "")[2];
                            stack[stack.length-1].content.push({ending: "full", ...blocks[i], ..._});
                        } else if (_.name in singletonTags) {
                            stack[stack.length-1].content.push(_);
                            stack.push(blocks[i]);
                        } else {
                            stack.push(_);
                            stack.push(blocks[i]);
                        }
                    } else if (_.name in singletonTags ? singletonTags[_.name].includes(blocks[i].name) && blocks[i].ending: false) {
                        stack[stack.length-1].content.push(_);
                        stack[stack.length-1].ending = "full";
                        let __ = stack.pop();
                        stack[stack.length-1].content.push({ending: "full", ...blocks[i], ...__});
                    } else {
                        stack.push(_);
                        stack.push(blocks[i]);
                    }
                } else {
                    if (stack[stack.length-1].ending) stack.push(blocks[i]);
                    else stack[stack.length-1].content.push(blocks[i]);
                }
            }
            // console.error(JSON.stringify(stack, null, 2), "end");

            // Failsafes
            if (stack.length != 1) {
                console.error(SyntaxError("Stack is not in length 1, probably unbalanced tag?"));
                // Flush the stack
                stack = [{type: "tag", name: "message", data: undefined, ending: false, content: stack.map(blockToString).slice(1)}]
            }
            blocks = stack.pop();
            old = blocks;
            // console.log(JSON.stringify(blocks));
        }
        if (debug) console.log("Phase 2", blocks);

        return toElement(blocks)[0];
    }

    function safeCSS(css) {
        return css.split(";")[0];
    }

    function toElement(block) {
        if (block.type == "tag") {
            let name = tagTypes[block.name];
            let result = document.createElement(name);
            let data = escapeHTML(block.data);
            for (var i of block.content) {
                for (var c of toElement(i)) {
                    result.appendChild(c);
                }
            }
            try {
                switch (block.name) {
                    case "color":
                        result.setAttribute("style", `color: ${safeCSS(data || "inherit")};`);
                        break;
                    case "bgcolor":
                        result.setAttribute("style", `background-color: ${safeCSS(data || "inherit")};`);
                        break;
                    case "font":
                        result.setAttribute("style", `font-family: ${safeCSS(data || "inherit")};`);
                        break;
                    case "size":
                        result.setAttribute("style", `font-size: ${data?safeCSS(data.replace(/[^\d]+/g, ""))+"pt":"inherit"} !important;`);
                        break;
                    case "small":
                        result.setAttribute("style", `font-size: 0.75em !important;`);
                        break;
                    case "big":
                        result.setAttribute("style", `font-size: 1.5em !important;`);
                        break;
                    case "right":
                        result.setAttribute("style", `text-align: right !important;`);
                        break;
                    case "center":
                        result.setAttribute("style", `text-align: center !important;`);
                        break;
                    case "url":
                        if (data) result.setAttribute("href", data);
                        else result.setAttribute("href", result.innerText);
                        break;
                    case "iframe":
                        if (noIFrame) {
                            let warning = document.createElement("div");
                            result.parentNode.insertBefore(warning, result);
                            result.parentNode.removeChild(result);
                        } else {
                            if (data) result.setAttribute("title", data);
                            result.setAttribute("src", result.innerText);
                            break;
                        }
                    case "embed":
                    case "audio":
                    case "video":
                        if (data) result.setAttribute("type", data);
                        result.setAttribute("src", result.innerText);
                        result.setAttribute("controls", undefined);
                        break;
                    case "topic":
                        if (data) result.setAttribute("href", data.replace(/[^\d]+/g, ""));
                        else {
                            result.setAttribute("href", result.innerText.replace(/[^\d]+/g, ""));
                            result.innerText = `https://tbgforums.com/forums/viewtopic.php?id=${result.innerText}`
                        }
                        result.setAttribute("href", `https://tbgforums.com/forums/viewtopic.php?id=${result.getAttribute("href")}`);
                        break;
                    case "post":
                        if (data) result.setAttribute("href", data.replace(/[^\d]+/g, ""));
                        else {
                            result.setAttribute("href", result.innerText.replace(/[^\d]+/g, ""));
                            result.innerText = `https://tbgforums.com/forums/viewtopic.php?pid=${result.innerText}#p${result.innerText}`
                        }
                        result.setAttribute("href", `https://tbgforums.com/forums/viewtopic.php?pid=${result.getAttribute("href")}#p${result.getAttribute("href")}`);
                        break;
                    case "forum":
                        if (data) result.setAttribute("href", data.replace(/[^\d]+/g, ""));
                        else {
                            result.setAttribute("href", result.innerText.replace(/[^\d]+/g, ""));
                            result.innerText = `https://tbgforums.com/forums/viewforum.php?id=1${result.innerText}`
                        }
                        result.setAttribute("href", `https://tbgforums.com/forums/viewforum.php?id=1${result.getAttribute("href")}`);
                        break;
                    case "user":
                        if (data) result.setAttribute("href", data.replace(/[^\d]+/g, ""));
                        else {
                            result.setAttribute("href", result.innerText.replace(/[^\d]+/g, ""));
                            result.innerText = `https://tbgforums.com/forums/profile.php?id=2${result.innerText}`
                        }
                        result.setAttribute("href", `https://tbgforums.com/forums/profile.php?id=2${result.getAttribute("href")}`);
                        break;
                    case "img":
                        result.setAttribute("src", result.innerText);
                        result.setAttribute("alt", data);
                        result.setAttribute("title", data);
                        break;
                    case "#":
                    case "|":
                        let spanType = data[0];
                        let size = data.slice(1).replace(/[^\d]+/g, "");
                        if (spanType == "r" || spanType == "-") {
                            result.setAttribute("rowspan", size);
                        } else if (spanType == "c" || spanType == "|") {
                            result.setAttribute("colspan", size);
                        }
                        break;
                    case "quote":
                        result.setAttribute("class", "quotebox");
                        result.innerHTML = (data?`<cite >${data} wrote:</cite>`:"") + `<blockquote><div >${result.innerHTML}</div></blockquote>`;
                        break;
                    case "box":
                        result.setAttribute("class", "blockmessage");
                        result.innerHTML = (data?`<h2><span>${data}</span></h2>`:"") + `<div class="box" style="padding: 0px 10px;"><div class="inbox">${result.innerHTML}</div></div>`;
                        break;
                    case "code":
                        result.setAttribute("class", "codebox");
                        result.innerHTML = `<pre><code>${result.innerHTML}</code></pre>`;
                        break;
                    case "c":
                        result.setAttribute("style", "display: inline; margin: 0px;");
                    case "list":
                        let inner = result.innerHTML;
                        if (data) {
                            result = document.createElement("ol");
                            result.innerHTML = inner;
                            result.setAttribute("start", data);
                        }
                        break;
                    case "table":
                        let boxed = document.createElement("div");
                        boxed.setAttribute("class", "box");
                        boxed.appendChild(result);
                        result = boxed;
                        console.log(result);
                        break;
                    case "width":
                        result.setAttribute("style", `width: ${data?safeCSS(data):"100%"} !important;`);
                        break;
                    default:
                        result.setAttribute("data", escapeHTML(block.data));
                        break;
                }
            } catch (e) {
                return toElement(blockToString(block));
            }
            return [result];
        } else {
            let m = ""
            if (m = block.content.match(/^(\n+)$/)) {
                return Array(m[1].length).fill(document.createElement("br"));
            } else {
                let result = document.createElement("p");
                result.innerText = block.content;
                return [result];
            }
        }
    }

    function elementToBBCode(post) {
        // What we really care for now is unparsing [code]s, although this will
        // become more populated when BBCode is switched back on.
        let result = "";
        for (let node of post.childNodes) {
            switch (node.nodeName.toLowerCase()) {
                case "#text":
                    result += node.wholeText;
                    break;
                case "p":
                    for (let n of node.childNodes) {
                        if (n.nodeName.toLowerCase() == "br") result += "\n";
                        else if (n.nodeName.toLowerCase() == "#text") result += n.wholeText;
                    }
                case "br":
                    result += "\n";
                case "div":
                    if (node.getAttribute("class") == "codebox") {
                        result += `[code]${node.innerText}[/code]`;
                    }
                    break;
            }
        }
        return result.trim();
    }

    function correctText(post, id) {
        console.log([...post.childNodes].map(a => a.outerHTML), id);
        let result = post.cloneNode();
        let accumulator = document.createElement("p");
        for (var node of [...post.childNodes]) {
            console.log(node.outerHTML, accumulator.outerHTML);
            if (node.nodeName.toLowerCase() == "p") { // regular text
                let prev = "";
                console.log(node.childNodes);
                for (var n of [...node.childNodes]) {
                    console.log(n);
                    if (n.nodeName.toLowerCase() == "#text" && prev == "#text") {
                        accumulator.appendChild(n);
                    } else accumulator.appendChild(n);
                    prev = n.nodeName.toLowerCase();
                }
            } else if (node.nodeName.toLowerCase() == "div" && node.getAttribute("class") == "quotebox") { // quotes
                let quote = node.cloneNode(true);
                let content = node.querySelector("blockquote div");
                let r = correctText(content, id+".quote");
                content.innerHTML = "";
                for (var n of [...r.childNodes]) content.appendChild(n);

                result.appendChild(accumulator);
                result.appendChild(quote);
                accumulator = document.createElement("p");
            } else if (textStyles.includes(node.nodeName.toLowerCase())) { // styles
                let acc2 = node.cloneNode();
                for (var n of [...node.childNodes]) {
                    if (n.nodeName.toLowerCase() == "p") {
                        acc2.appendChild(new Text(n.innerText));
                    } else {
                        acc2.appendChild(n);
                    }
                }
                accumulator.append(acc2);
            } else if (node.nodeName.toLowerCase() == "div" && node.getAttribute("class") == "codebox") { // quotes
                result.appendChild(accumulator);
                result.appendChild(node);
                accumulator = document.createElement("p");
            } else { // something else
                result.appendChild(accumulator);
                result.appendChild(correctText(node));
                accumulator = document.createElement("p");
            }
        }
        result.append(accumulator);
        return result;
    }

    // Process all the posts
    for (var post of document.querySelectorAll("#brdmain div.blockpost")) {
        // Process post
        try {
            let code = post.querySelector("a[onclick^=Quote]"); // consider using the quick post button
            if (code) code = eval(code.getAttribute("onclick").match(/Quote\('.+?', ('.+')\)/)[1]); // this might be super dumb
            else {
                // consider using a the post itself
                code = elementToBBCode(post.querySelector("div.postright div.postmsg"));
            }
            let result = parse(code);
            result = correctText(result, post.getAttribute("id"));
            let content = post.querySelector("div.postright div.postmsg");
            content.innerHTML = "";
            for (var node of [...result.childNodes]) {content.appendChild(node)}
        } catch (e) {console.error(`Error when parsing post of ${post.getAttribute("id")}\n`, e)}

        // Process signatures
        try {
            let code = elementToBBCode(post.querySelector("div.postsignature"));
            let result = parse(code);
            result = correctText(result);
            let content = post.querySelector("div.postright div.postsignature");
            content.innerHTML = "";
            for (var node of [...result.childNodes]) {content.appendChild(node)}
        } catch (e) {console.error(`Error when parsing signature of ${post.getAttribute("id")}\n`, e)}
    }

    // Embed parse, toElement, and elementToBBCode to document because why not
    document.parse = parse;
    document.toElement = toElement;
    document.elementToBBCode = elementToBBCode;

    // Bodges

    // Add <hr>s because the conversion removed them
    for (var post of document.querySelectorAll("#brdmain div.blockpost div.postright div.postsignature")) {
        post.prepend(document.createElement("hr"));
    }

    // Remove trailing <br> and empty <p>s
    for (var p of document.querySelectorAll('#brdmain div.blockpost p')) {
        let children = [...p.childNodes];
        // remove <br> in the beggining
        let latch = false;
        let temp = [];
        for (var c of children) {
            if (c.nodeName.toLowerCase() != "br" || latch) {
                temp.push(c);
                latch = true;
            }
        }
        // remove <br> in the end
        temp.reverse();
        children = temp;
        temp = [];
        for (var c of children) {
            if (c.nodeName.toLowerCase() != "br" || latch) {
                temp.push(c);
                latch = true;
            }
        }
        temp.reverse();
        // add them to the <p>
        p.innerHTML = "";
        for (var c of temp) {
            p.appendChild(c);
        }
    }
    for (var p of document.querySelectorAll('#brdmain div.blockpost p:empty')) {
        p.parentNode.removeChild(p);
    }

    // Trim tables (you'll see why I added this)
    for (var br of document.querySelectorAll("#brdmain div.blockpost div.postright div.postmsg table ~ br")) {
        br.parentNode.removeChild(br);
    }
    for (var br of document.querySelectorAll("#brdmain div.blockpost div.postright div.postmsg table > br")) {
        br.parentNode.removeChild(br);
    }

    // Forcely remove all <p>s on <code>, <h4> and <a>
    for (var code of document.querySelectorAll("#brdmain div.blockpost div.postright div.postmsg code")) {
        code.innerHTML = code.innerHTML.replace(/<\/?p>/g, "");
    }
    for (var code of document.querySelectorAll("#brdmain div.blockpost div.postright div.postmsg h4")) {
        code.innerHTML = code.innerHTML.replace(/<\/?p>/g, "");
    }
    for (var a of document.querySelectorAll("#brdmain div.blockpost div.postright div.postmsg a")) {
        a.innerHTML = a.innerHTML.replace(/<\/?p>/g, "");
        a.parentNode.insertBefore(document.createElement("br"), a.nextSibling);
    }

    // Take all <code>s out of <p>s
    for (var code of document.querySelectorAll("#brdmain div.blockpost div.postright div.postmsg div.codebox p pre")) {
        let parent = code.parentNode;
        parent.removeChild(code.parentNode);
        parent.parentNode.appendChild(code);
    }
})();