export function formatLastSeen(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (date.toDateString() === now.toDateString()) {
    return `Today ${time}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }

  return date.toLocaleDateString();
}

export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container || !message) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));

  window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => toast.remove(), 200);
  }, 3200);
}
