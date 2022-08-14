console.log("QuickPreview loaded");
var replyBox = document.getElementById("quickpost");
var buttons = replyBox.getElementsByClassName("buttons")[0];
var fieldset = replyBox.getElementsByClassName("inform")[0];
var tID = document.getElementsByClassName("crumbs")[0].getElementsByTagName("a")[2].href;
var tID = parseInt(/viewtopic\.php\?id=(\d+)/.exec(tID)[1]);

// Add things to the replybox
var button = document.createElement("input");
button.type = "button";
button.class = "quickpreview";
button.value = "Quick preview";
var previewBox = document.createElement("div");
previewBox.style.marginTop = "10px";
previewBox.id = "previewbox";
previewBox.classList.add("box"); 

function preview() {
    if (!fieldset.contains(previewBox)) {
        console.log("making preview box");
        // if reply box doesn't have preview box, add it
        fieldset.appendChild(previewBox);
    }
    var post = fieldset.getElementsByTagName("textarea")[0].value;
    console.log(post);
    // fetch
    console.log("fetching...");
    fetch(`https://tbgforums.com/forums/post.php?tid=${tID}`, 
    {
        credentials: "include",
        body: `form_sent=1&req_message=${encodeURIComponent(post)}&preview=Preview`,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        mode: "cors"
    }).then(r => {return r.text()}).then(
        function(data) {
            var doc = new DOMParser().parseFromString(data, 'text/html');
            //console.log(data);
            var prev = doc.getElementById("postpreview");
            //console.log(prev);
            prev = prev.getElementsByClassName("postmsg")[0].innerHTML;
            previewBox.innerHTML = prev;
            console.log("done");
        }
    ).catch(e => {throw e});
}

button.addEventListener("click", preview);

buttons.appendChild(button);
