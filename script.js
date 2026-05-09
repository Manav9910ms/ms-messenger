import "./auth.js";
import "./users.js";
import "./messages.js";
import "./presence.js";

const backBtn =
document.getElementById("backBtn");

if(backBtn){

  backBtn.onclick = ()=>{

    document
    .getElementById("sidebar")
    .classList.remove("hide");

    document
    .getElementById("chatArea")
    .classList.remove("active");

  };

}
