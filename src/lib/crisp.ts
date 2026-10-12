export function initCrisp(): void {
  const crispWindow = window as unknown as Window & {
    $crisp: unknown[][];
    CRISP_WEBSITE_ID: string;
    CRISP_READY_TRIGGER: () => void;
  };
  crispWindow.$crisp = [];
  crispWindow.CRISP_WEBSITE_ID = "bdd3f956-a76f-444f-8d4c-80e2209da4e1";
  crispWindow.CRISP_READY_TRIGGER = () => crispWindow.$crisp.push(["do", "chat:hide"]);
  crispWindow.$crisp.push(["on", "chat:closed", () => crispWindow.$crisp.push(["do", "chat:hide"])]);
  const script = document.createElement("script");
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;
  document.head.appendChild(script);
}
