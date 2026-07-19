"use client";

import { useEffect } from "react";

export default function DisableDevTools() {
  useEffect(() => {
    // 1. Disable Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Cmd+Opt+I, Cmd+Opt+J, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Check Ctrl or Cmd key
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl) {
        // Shift + I, Shift + J, Shift + C
        if (e.shiftKey && (
          e.key === "I" || e.key === "i" || 
          e.key === "J" || e.key === "j" || 
          e.key === "C" || e.key === "c"
        )) {
          e.preventDefault();
          return;
        }

        // Option/Alt + Command/Ctrl + I / J / C / U (Mac shortcuts)
        if (e.altKey && (
          e.key === "I" || e.key === "i" || 
          e.key === "J" || e.key === "j" || 
          e.key === "C" || e.key === "c" || 
          e.key === "U" || e.key === "u"
        )) {
          e.preventDefault();
          return;
        }

        // Ctrl + U / Cmd + U (View Source)
        if (e.key === "U" || e.key === "u") {
          e.preventDefault();
          return;
        }

        // Ctrl + S / Cmd + S (Save Page)
        if (e.key === "S" || e.key === "s") {
          e.preventDefault();
          return;
        }
      }
    };

    // 3. Debugger Statement Loop to pause page execution if Developer Tools are opened
    const devtoolsTest = () => {
      try {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
          // If window size indicates devtools console is docked, trigger debugger
          (function() {
            (function a() {
              debugger;
            })();
          })();
        }
      } catch (e) {}
    };

    const intervalId = setInterval(devtoolsTest, 500);

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
