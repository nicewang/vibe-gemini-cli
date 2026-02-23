const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ProxyAgent, setGlobalDispatcher } = require("undici");
const { execSync } = require("child_process");
const fs = require("fs");

/**
 * 💡 RESEARCHER CONFIGURATION
 * KEEP_SOURCE: Set to true to preserve your .cpp, .py, or .java source files.
 * Note: Temporary shell scripts (.sh) are always deleted after execution to keep the directory clean.
 */
const KEEP_SOURCE = true;

// 1. GLOBAL PROXY SETUP
// Required for Node.js (v18+) to bypass local network restrictions via ClashX (Port 7890).
const dispatcher = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(dispatcher);

// 2. INITIALIZE GEMINI 3 FLASH (PREVIEW)
// The API Key is securely loaded from your .env file using Node's native --env-file flag.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY not found in environment. Ensure you run with --env-file=.env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

async function run() {
    const prompt = process.argv.slice(2).join(" ") || "Write and run a simple C++ program";
    console.log(`\n🚀 AI Agent Analysis: "${prompt}"...`);
    
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log("\n--- AI Response ---\n" + responseText);

        const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
        let match;
        const blocks = [];

        // 3. EXTRACT CODE BLOCKS & DETECT FILENAMES DYNAMICALLY
        while ((match = codeBlockRegex.exec(responseText)) !== null) {
            const lang = match[1].toLowerCase();
            const content = match[2].trim();
            
            // Heuristic: Search for filenames in the 150 characters preceding the code block.
            const contextText = responseText.substring(Math.max(0, match.index - 150), match.index);
            const nameMatch = contextText.match(/(?:named|file|save as|in)\s+[`']?([\w\-\.]+\.\w+)[`']?/i);
            
            const fileName = nameMatch ? nameMatch[1] : `agent_gen_${Date.now()}_${blocks.length}.${lang}`;
            blocks.push({ lang, content, fileName });
        }

        const createdFiles = new Set();
        const executables = new Set();
        const hasShellScript = blocks.some(b => b.lang === 'bash' || b.lang === 'sh');

        // 4. SAVE EXTRACTED FILES
        blocks.forEach(block => {
            fs.writeFileSync(block.fileName, block.content);
            console.log(`💾 File Saved: ${block.fileName}`);
            createdFiles.add(block.fileName);
        });

        // 5. INTELLIGENT EXECUTION ENGINE
        for (const block of blocks) {
            // Priority Logic: If AI provides a shell script, we only execute that script.
            // This prevents duplicate binary generation and respects AI's custom build instructions.
            if (hasShellScript && block.lang !== 'bash' && block.lang !== 'sh') continue;

            let runCmd = "";
            if (block.lang === 'python' || block.lang === 'py') runCmd = `python3 ${block.fileName}`;
            if (block.lang === 'bash' || block.lang === 'sh') runCmd = `bash ${block.fileName}`;
            // Auto-compile for C++ if no shell script is provided to orchestrate the process.
            if (!hasShellScript && block.lang === 'cpp') runCmd = `g++ ${block.fileName} -o res_bin && ./res_bin`;

            if (runCmd) {
                try {
                    console.log(`⚙️ Executing: ${runCmd}`);
                    const output = execSync(runCmd, { encoding: 'utf-8' });
                    console.log(`✅ EXECUTION OUTPUT:\n${output}`);
                    
                    // Track binaries for cleanup (e.g., res_bin or names specified via -o)
                    if (runCmd.includes("-o ")) {
                        const bin = runCmd.split("-o ")[1].split(" ")[0];
                        executables.add(bin);
                    } else if (runCmd.includes("res_bin")) {
                        executables.add("res_bin");
                    }
                } catch (e) {
                    console.error(`❌ Execution failed for ${block.fileName}`);
                }
            }
        }

        // 6. FINAL CLEANUP
        console.log("\n--- Post-Task Cleanup ---");
        createdFiles.forEach(file => {
            // Delete .sh files automatically; delete source files only if KEEP_SOURCE is false.
            if (file.endsWith('.sh') || !KEEP_SOURCE) {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    console.log(`🧹 Removed temporary file: ${file}`);
                }
            }
        });
        
        // Always remove compiled binary artifacts to keep the workspace tidy.
        executables.forEach(bin => {
            if (fs.existsSync(bin)) {
                fs.unlinkSync(bin);
                console.log(`🧹 Removed binary artifact: ${bin}`);
            }
        });

    } catch (error) {
        console.error("\n❌ API / Network Error:", error.message);
    }
}

run();