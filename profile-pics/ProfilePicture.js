console.log("ProfilePicture loaded");
var main = document.getElementById("brdmain");
var posts = main.getElementsByClassName("blockpost");
for (var post of posts) {
    var signature = post.getElementsByClassName("postsignature")[0].innerHTML;
    var table = post.getElementsByClassName("postleft")[0].children[0];
    let match = /\[avatar=(.+?)\]/.exec(signature);
    if (match !== null && table.getElementsByClassName("postavatar").length == 0) {
        var image = document.createElement("img");
        image.src = match[1];
        image.width = 90; image.height = 90;
        image.className = "postavatar";
        var after = table.getElementsByClassName("usertitle")[0];
        table.insertBefore(image, after.nextSibling);
    }
}
