var replyBox = document.getElementsByTagName("form")[1];
// encodes message before it gets posted
function test(event){
    event.target.elements.req_message.value=BMPEncode(event.target.elements.req_message.value);
    console.log(event.target.elements.req_message.value)
}
replyBox.onsubmit = event => {
    test(event);
    document.getElementsByTagName("form")[1].onsubmit()
};
console.log("Injected code to form");
