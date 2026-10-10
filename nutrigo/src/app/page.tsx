"use client";
import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert h-5 w-[100px]"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the{" "}
//             <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
//               page.tsx
//             </code>{" "}
//             file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert h-[14px] w-4"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={14}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//         <input type="text" id="textinput" placeholder="enter food here"></input>
//         <button onClick={() => getCalories()}>
//             Get Calories
//         </button>
//       </main>
//     </div>
//   );
// }

import { useState } from "react";
import StreetMap from "../components/map/StreetMap";
import Camera from "../components/camera";

export default function Home() {
    const [showCamera, setShowCamera] = useState(false);

    return (
        <main>
            <h1>Nearby Streets</h1>

            <div
                style={{
                    position: "relative",
                    width: "100%",
                }}
            >
                <StreetMap />

                {showCamera && (
                    <div
                        style={{
                            position: "absolute",
                            top: "20px",
                            right: "20px",
                            zIndex: 2000,
                            background: "white",
                            padding: "10px",
                            borderRadius: "10px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        }}
                    >
                        <Camera />
                    </div>
                )}

                <button
                    onClick={() => setShowCamera(!showCamera)}
                    style={{
                        position: "absolute",
                        top: "20px",
                        left: "20px",
                        zIndex: 2001,
                        background: "black",
                    }}
                >
                    {showCamera ? "Close Camera" : "Open Camera"}
                </button>
            </div>
        </main>
    );

}

async function getCalories() {

    const foodName = (document.getElementById("textinput") as HTMLInputElement).value;

    const response = await fetch(
        `/api/calories?food=${encodeURIComponent(foodName)}`
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data.error);
        return;
    }

    console.log("Food:", data.food);
    console.log("Calories:", data.calories);
}