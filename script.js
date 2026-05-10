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

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();

    const users = document.querySelectorAll(".user");

    users.forEach(user => {
        const text = user.innerText.toLowerCase();

        if(text.includes(value)){
            user.style.display = "flex";
        } else {
            user.style.display = "none";
        }
    });
});

const profilePage = document.getElementById("profilePage");
const closeProfileBtn = document.getElementById("closeProfileBtn");

const profilePageImg = document.getElementById("profilePageImg");
const profilePageName = document.getElementById("profilePageName");
const profilePageEmail = document.getElementById("profilePageEmail");
