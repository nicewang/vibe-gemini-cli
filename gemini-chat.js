const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ProxyAgent, setGlobalDispatcher } = require("undici");
const { execSync } = require("child_process");
const fs = require("fs");

/**
 * 💡 RESEARCHER CONFIGURATION
 * KEEP_FILES: Set to true to preserve generated source code.
 */
const KEEP_FILES = true;

// 1. PROXY SETUP (ClashX 7890)
const dispatcher = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(dispatcher);

/**
 * 2. INITIALIZE GEMINI 3 FLASH
 * Now reading the API Key from environment properties.
 */
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("\n❌ ERROR: API Key not found. Please check your .env file.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

async function run() {
  const prompt = process.argv.slice(2).join(" ") || "Analyze my GD-SVG setup";
  console.log(`\n🚀 Agent analyzing: "${prompt}"...`);
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log("\n--- AI Response ---\n" + responseText);

    const langConfigs = {
      'cpp': { ext: 'cpp', run: (fn) => `g++ ${fn} -o app_out && ./app_out`, bin: 'app_out' },
      'python': { ext: 'py', run: (fn) => `python3 ${fn}`, bin: null },
      'bash': { ext: 'sh', run: (fn) => `bash ${fn}`, bin: null },
      'sh': { ext: 'sh', run: (fn) => `bash ${fn}`, bin: null }
    };

    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
    let match;
    let createdFiles = new Set();
    let filesToDelete = new Set();

    while ((match = codeBlockRegex.exec(responseText)) !== null) {
      const lang = match[1].toLowerCase();
      const config = langConfigs[lang];

      if (config) {
        const startPos = Math.max(0, match.index - 100);
        const nameMatch = responseText.substring(startPos, match.index).match(/named [`'](.+?\.\w+)[`']/i);
        let fileName = nameMatch ? nameMatch[1] : `temp_agent_${Date.now()}.${config.ext}`;

        if ((lang === 'bash' || lang === 'sh') && createdFiles.has(fileName)) {
            fileName = `temp_run_${Date.now()}.sh`;
        }

        fs.writeFileSync(fileName, match[2].trim());
        console.log(`\n💾 Saved: ${fileName}`);
        createdFiles.add(fileName);
        
        if (!KEEP_FILES) filesToDelete.add(fileName);
        if (config.bin && !KEEP_FILES) filesToDelete.add(config.bin);

        try {
          console.log(`⚙️ Executing ${lang}...`);
          const output = execSync(config.run(fileName), { encoding: 'utf-8' });
          console.log(`✅ SUCCESS:\n${output}`);
        } catch (e) {
          console.error(`❌ FAILED for ${fileName}.`);
          filesToDelete.delete(fileName);
        }
      }
    }

    if (filesToDelete.size > 0) {
      console.log("\n--- Finalizing Task ---");
      filesToDelete.forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
    }

  } catch (error) {
    console.error("\n❌ API Error:", error.message);
  }
}

run();