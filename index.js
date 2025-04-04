import fetch from 'node-fetch';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import cfonts from "cfonts";

dotenv.config();

const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const AGENT_ID = process.env.AGENT_ID;
const TOKEN = process.env.TOKEN;
const BASE_URL = 'https://api.service.crestal.network/v1';
const CHAT_ID = `${WALLET_ADDRESS}-${AGENT_ID}`;
const MAX_LENGTH = 1000;

const headersPost = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/json',
  'Cookie': `session_token=${TOKEN}`
};

const headersGet = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/json',
  'Cookie': `session_token=${TOKEN}`
};

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.log(chalk.red("❌ Không thể phân tích JSON. Phản hồi thô:"));
    console.log(text);
    throw new Error("Phản hồi JSON không hợp lệ");
  }
}

async function reportActivity(type) {
  const url = `${BASE_URL}/report?user_address=${WALLET_ADDRESS}&type=${type}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/json',
      'Cookie': `session_token=${TOKEN}`,
    }
  });
  const data = await safeJson(res);
  console.log(chalk.gray(`📤 Đã báo cáo ${type}: ${data.msg || JSON.stringify(data)}`));
}

async function getRandomMessage() {
  const fileContent = await fs.readFile('NTE-Pesan.txt', 'utf8');
  const messages = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messages.length === 0) {
    throw new Error("❌ NTE-Pesan.txt trống hoặc định dạng không đúng.");
  }

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

async function sendMessage(message) {
  const trimmed = message.length > MAX_LENGTH ? message.slice(0, MAX_LENGTH) : message;
  const payload = {
    message: trimmed,
    agent_id: parseInt(AGENT_ID),
    user_address: WALLET_ADDRESS,
    chat_id: CHAT_ID,
  };

  const postRes = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: headersPost,
    body: JSON.stringify(payload),
  });

  const postData = await safeJson(postRes);

  for (const msg of postData) {
    console.log(chalk.green(`\n🟢 Tin nhắn được gửi bởi đại lý ${chalk.cyan(msg.agent_id)}:`));
    console.log(chalk.yellow(`"${msg.message}"`));
  }
}

async function startLoop(loopCount) {
  while (true) {
    console.log(chalk.blueBright(`\n🔄 Bắt đầu vòng lặp tin nhắn: ${loopCount} lần`));

    const spinner = ora('Đang tải tin nhắn ngẫu nhiên...').start();
    const fileContent = await fs.readFile('NTE-Pesan.txt', 'utf8');
    const allMessages = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    spinner.succeed(`Đã tải ${allMessages.length} tin nhắn.`);

    // Report activities
    const activityTypes = [
      'interact_with_crestal_x',
      'feedback',
      'post_about_crestal',
      'read_blog',
    ];

    for (const type of activityTypes) {
      await reportActivity(type);
    }

    // Message loop
    for (let i = 1; i <= loopCount; i++) {
      const message = allMessages[Math.floor(Math.random() * allMessages.length)];
      console.log(chalk.magenta(`\n📩 [${i}/${loopCount}] Đang gửi tin nhắn: "${message}"`));
      await sendMessage(message);
      await sleep(5000); // đợi 5 giây giữa mỗi bài đăng
    }

    const userInfoRes = await fetch(`${BASE_URL}/users/${WALLET_ADDRESS}`, {
      method: 'GET',
      headers: headersGet,
    });
    const userData = await safeJson(userInfoRes);

    const { rank_v1, rank, total_point, total_point_v1 } = userData;

    console.log('🏅 Thông tin người dùng:');
    console.log(`- Hạng V1: ${rank_v1}`);
    console.log(`- Hạng: ${rank}`);
    console.log(`- Tổng điểm: ${total_point}`);
    console.log(`- Tổng điểm V1: ${total_point_v1}`);
    console.log(chalk.bgGreen.black(`✅ Đã hoàn thành ${loopCount} tin nhắn. Đợi 24 giờ để lặp lại...\n`));
    await sleep(24 * 60 * 60 * 1000); // đợi 24 giờ
  }
}

function askLoopCount() {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(chalk.cyan('🔁 Bạn muốn gửi tin nhắn bao nhiêu lần mỗi chu kỳ? '), answer => {
      rl.close();
      const num = parseInt(answer);
      if (isNaN(num) || num < 1) {
        console.log(chalk.red('❌ Số không hợp lệ. Vui lòng nhập một số dương hợp lệ.'));
        process.exit(1);
      }
      resolve(num);
    });
  });
}

function centerText(text, color = "cyanBright") {
  const terminalWidth = process.stdout.columns || 80;
  const textLength = text.length;
  const padding = Math.max(0, Math.floor((terminalWidth - textLength) / 2));
  return " ".repeat(padding) + chalk[color](text);
}

(async () => {
  cfonts.say("LocalSec", {
    font: "block",
    align: "center",
    colors: ["cyan", "magenta"],
    background: "black",
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: "0",
  });
  console.log(centerText("=== Twitter: 🚀 : https://x.com/Local_sec ==="));
  console.log(centerText("⌞👤 Tool Created by NT Exhaust- Phát triển bởi: LocalSec"));
  const loopCount = await askLoopCount();
  await startLoop(loopCount);
})();
