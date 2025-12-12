import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

export const getTimeRange = (timestamp: number | string) => {
  const now = new Date();
  const date = new Date(Number(timestamp) * 1000);

  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  const nowDate = now.getDate();
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();

  const dateDate = date.getDate();
  const dateMonth = date.getMonth();
  const dateYear = date.getFullYear();

  if (nowYear === dateYear && nowMonth === dateMonth && nowDate === dateDate) {
    return "Today";
  } else if (nowYear === dateYear && nowMonth === dateMonth && nowDate - dateDate === 1) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return "Previous 7 days";
  } else if (diffDays <= 30) {
    return "Previous 30 days";
  } else if (nowYear === dateYear) {
    return date.toLocaleString("default", { month: "long" });
  } else {
    return date.getFullYear().toString();
  }
};

export const decodeString = (str: string) => {
  try {
    return decodeURIComponent(str);
  } catch (e: unknown) {
    console.error(e);
    return str;
  }
};

export const formatDate = (inputDate: number) => {
  const date = dayjs(inputDate);

  if (date.isToday()) {
    return `Today at ${date.format("LT")}`;
  } else if (date.isYesterday()) {
    return `Yesterday at ${date.format("LT")}`;
  } else {
    return `${date.format("L")} at ${date.format("LT")}`;
  }
};
