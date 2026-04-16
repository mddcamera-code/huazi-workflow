import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata = {
  title: "华仔口播工作流",
  description: "抖音口播选题、脚本生成与风险检测工具",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
