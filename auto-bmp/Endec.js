console.log("GrogarAE loaded");
function BMPEncode(input){
    var res = "";
    var pre = 0;

    for (var c of [...input]){
        if ((c.codePointAt() >= 0xE000 && c.codePointAt() < 0xF900) || c.codePointAt() >= 0x10000) {
            hi = c.codePointAt() >> 12;
            lo = c.codePointAt() % 0x1000;
            if (hi != pre) res += String.fromCodePoint(hi + 0xF000);
            res += String.fromCodePoint(lo + 0xE000);
            pre = hi;
        }
        else res += c;
    }
    return res;
}

function BMPDecode(input){
    var res = "";
    var hi = 0;
    var lo = 0;

    for (var c of [...input]) {
        if (c.codePointAt() >= 0xF000 && c.codePointAt() < 0xF900) hi = c.codePointAt() - 0xF000;
        else if (c.codePointAt() >= 0xE000 && c.codePointAt() < 0xF000) {
            lo = c.codePointAt() - 0xE000;
            res += String.fromCodePoint(hi * 0x1000 + lo);
        }
        else res += c;
    }
    return res;
}

function decodePosts(brdmain){
    // brdmain should be a HTML element/node containing posts
    var posts = [...brdmain.getElementsByClassName("blockpost")];
    posts.forEach(a=>a.getElementsByClassName("postmsg")[0].innerHTML=BMPDecode(a.getElementsByClassName("postmsg")[0].innerHTML));
}

var board = document.getElementById("brdmain");
decodePosts(board);
