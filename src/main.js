// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import url from "url";
import { app, Menu, ipcMain, shell } from "electron";
import appMenuTemplate from "./menu/app_menu_template";
import editMenuTemplate from "./menu/edit_menu_template";
import devMenuTemplate from "./menu/dev_menu_template";
import createWindow from "./helpers/window";
const { Client, Authenticator } = require('minecraft-launcher-core');
const config = require('dotenv').config();

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";

// Create new Minecraft Client Object
const launcher = new Client();

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

const setApplicationMenu = () => {
  const menus = [appMenuTemplate, editMenuTemplate];
  if (env.name !== "production") {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// We can communicate with our window (the renderer process) via messages.
const initIpc = () => {
  ipcMain.on("need-app-path", (event, arg) => {
    event.reply("app-path", app.getAppPath());
  });
  ipcMain.on("open-external-link", (event, href) => {
    shell.openExternal(href);
  });
  ipcMain.on('launch-game', (event, arg) => {
    console.log("launching")
    let opts = {
      clientPackage: null,
      // For production launchers, I recommend not passing 
      // the getAuth function through the authorization field and instead
      // handling authentication outside before you initialize
      // MCLC so you can handle auth based errors and validation!
      authorization: Authenticator.getAuth(config.MC_USER, config.MC_PASS),
      root: "./minecraft",
      version: {
          number: "1.17.1",
          type: "release"
      },
      memory: {
          max: "6G",
          min: "4G"
      }
    }
  
    launcher.launch(opts);
    //event.reply('asynchronous-reply', 'pong')
  })
};

app.on("ready", () => {
  setApplicationMenu();
  initIpc();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      // Two properties below are here for demo purposes, and are
      // security hazard. Make sure you know what you're doing
      // in your production app.
      nodeIntegration: true,
      contextIsolation: false,
      // Spectron needs access to remote module
      enableRemoteModule: env.name === "test"
    }
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "app.html"),
      protocol: "file:",
      slashes: true
    })
  );

  if (env.name === "development") {
    mainWindow.openDevTools();
  }
  launcher.on('debug', (e) => mainWindow.webContents.send('game-debug',e))
  launcher.on('data', (e) => mainWindow.webContents.send('game-data',e))
});

app.on("window-all-closed", () => {
  app.quit();
});
