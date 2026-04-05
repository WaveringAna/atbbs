import { initLocaltime } from "./pages/localtime";
import { initHome } from "./pages/home";
import { initBoard } from "./pages/board";
import { initThread } from "./pages/thread";
import { initAccount } from "./pages/account";

initLocaltime();

if (document.getElementById("handle-form")) initHome();
if (document.getElementById("threads")) initBoard();
if (document.getElementById("replies")) initThread();
if (document.getElementById("inbox")) initAccount();
