declare module "@tauri-apps/api/notification" {
  export type PermissionStatus = "granted" | "denied" | "prompt";
  export const isPermissionGranted: () => Promise<boolean>;
  export const requestPermission: () => Promise<PermissionStatus>;
  export const sendNotification: (options: { title: string; body: string }) => void;
}

declare module "@tauri-apps/api/updater" {
  export const checkUpdate: () => Promise<unknown>;
}
