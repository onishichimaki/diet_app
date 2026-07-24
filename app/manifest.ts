import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Habi — 今日を、ちょっといい日に。",
    short_name: "Habi",
    description: "食事・体重・運動・睡眠を、やさしく続ける健康管理アプリ。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#f7f3ea",
    lang: "ja",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
