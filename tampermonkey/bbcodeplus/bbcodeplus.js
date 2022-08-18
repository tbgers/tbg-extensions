// ==UserScript==
// @name         BBCode+
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Enhances the BBCode parser. (parsing is done locally)
// @author       Gilbert189
// @match        *://tbgforums.com/forums/edit.php*
// @match        *://tbgforums.com/forums/post.php*
// @match        *://tbgforums.com/forums/viewtopic.php*
// @icon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
        "ins": "ins",
        "quote": "div",
        "code": "div",
        "img": "img",
        "color": "span",
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
        "img": "img",/* // too lazy to implement this
        "post": "a",
        "topic": "a",
        "forum": "a",
        "user": "a",
        "email": "a",*/
        "marquee": "marquee",
        "table": "table",
        "-": "tr",
        "#": "th",
        "|": "td",
        "box": "div"
    }

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
        console.log("Phase -1", JSON.stringify(text));

        text = text.replace(/\[(.+?)(?:=[^\]]+?)?\]\[\/\1\]/g, "");
        console.log("Phase 0", JSON.stringify(text));

        // Parse text into blocks
        let blocks = [];
        var temp = "";
        var layers = 0;
        for (var i of text) {
            if (i == "[" && layers != 2) {
                if (layers == 0) {
                    blocks.push({type: "text", content: temp});
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
        while (blocks[blocks.length-1].type == "text") {
            let a = blocks.pop();
            concat += a.content;
        }
        blocks.push({type: "text", content: concat});
        console.log("Phase 1", blocks)

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
        console.log("Phase 2", blocks);

        return toElement(blocks);
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
                result.appendChild(toElement(i));
            }
            switch (block.name) {
                case "color":
                    result.setAttribute("style", `color: ${safeCSS(data || "inherit")};`);
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
                default:
                    result.setAttribute("data", escapeHTML(block.data));
                    break;
            }
            return result;
        } else {
            let result = document.createElement("p");
            result.innerText = block.content;
            return result;
        }
    }

    function elementToBBCode(post) {
        // What we really care for now is de-parsing [code]s for now, although this will
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
                case "div":
                    if (node.getAttribute("class") == "codebox") {
                        result += `[code]${node.innerText}[/code]`;
                    }
                    break;
            }
        }
        return result.trim();
    }

    // Process all the posts
    for (var post of document.querySelectorAll("#brdmain div[id^=p]")) {
        // Process post
        try {
        console.log(post);
        let code = post.querySelector("a[onclick^=Quote]"); // consider using the quick post button
        if (code) code = eval(code.getAttribute("onclick").match(/Quote\('.+?', ('.+')\)/)[1]); // this might be super dumb
        else {
            // consider using a the post itself
            code = elementToBBCode(post.querySelector("div.postright div.postmsg"));
        }
        let result = parse(code);
        post.querySelector("div.postright div.postmsg").innerHTML = result.innerHTML;
        } catch (e) {}

        // Process signatures
        try {
            code = elementToBBCode(post.querySelector("div.postsignature"));
            result = parse(code);
            post.querySelector("div.postright div.postsignature").innerHTML = result.innerHTML;
        } catch (e) {}
    }

    // Bodges

    // Add <hr>s because the conversion removed them
    for (var post of document.querySelectorAll("#brdmain div[id^=p] div.postright div.postsignature")) {
        post.prepend(document.createElement("hr"));
    }

    // Remove blank <p>s and add <br>s
    for (var post of document.querySelectorAll("#brdmain div[id^=p] div.postright div.postmsg")) {
        for (var p of post.querySelectorAll('p')) {
            p.innerHTML = p.innerHTML.replace(/^(<br>)+/, "");
        }
    }
    for (var br of document.querySelectorAll('p > br')) {
        br.parentNode.parentNode.insertBefore(br, br.parentNode);
        br.parentNode.removeChild(br);
    }
    for (var p of document.querySelectorAll('p:empty')) {
        p.parentNode.removeChild(p);
    }

    // Trim tables (you'll see why I added this)
    for (var post of document.querySelectorAll("#brdmain div[id^=p] div.postright div.postmsg table")) {
        let table = post.outerHTML;
        post.parentNode.innerHTML = table;
    }

    // Forcely remove all <p>s on <code> and <a>
    for (var code of document.querySelectorAll("#brdmain div[id^=p] div.postright div.postmsg code")) {
        code.innerHTML = code.innerHTML.replace(/<\/?p>/g, "");
    }
    for (var a of document.querySelectorAll("#brdmain div[id^=p] div.postright div.postmsg a")) {
        a.innerHTML = a.innerHTML.replace(/<\/?p>/g, "");
        a.parentNode.insertBefore(document.createElement("br"), a.nextSibling);
    }

})();
