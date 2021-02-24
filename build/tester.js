const fs = require("fs");
const path = require("path");
const file = require("./file");
const fse = require("fs-extra");
const env = require("./env");
const pjson = require("../package.json");

const nodeEnv = env.getNodeEnv();
const config = require("./configs.js")[nodeEnv];
const versyarnion = pjson.nrtcSdkVersion
const version = pjson.private ? pjson.privateVersion : pjson.version
const webrtcG2Version = pjson.webrtcG2Version
const suffix = env.isProduction() ? "" : "_" + nodeEnv;
const filename = env.isDevelopment()
  ? "NIM_Web_[name].js"
  : `NIM_Web_[name]_v${version}${suffix}.js`;

const webrtc2Filename = env.isDevelopment()
  ? "NIM_Web_[name].js"
  : `NIM_Web_[name]_v${webrtcG2Version}${suffix}.js`;

const libNames = {
  im: `NIM${suffix}.js`,
  chatroom: `Chatroom${suffix}.js`,
  sdk: `SDK${suffix}.js`,
  netcall: `Netcall${suffix}.js`,
  webrtc: `WebRTC${suffix}.js`,
  whiteboard: `WhiteBoard${suffix}.js`,
  nrtc: `WebRTC${suffix}.js`,
  nbb: `WebRTC${suffix}.js`
};

const minLibNames = {
  im: filename.replace("[name]", "NIM"),
  chatroom: filename.replace("[name]", "Chatroom"),
  sdk: filename.replace("[name]", "SDK"),
  netcall: filename.replace("[name]", "Netcall"),
  webrtc: filename.replace("[name]", "WebRTC"),
  webrtc2: webrtc2Filename.replace("[name]", "WebRTC2"),
  whiteboard: filename.replace("[name]", "WhiteBoard"),
  nrtc: filename.replace("[name]", "NRTC"),
  nbb: filename.replace("[name]", "NBB")
};

const testerSrcDir = "./nimwebsdkTester";
const testerDestDir = `./dist/nimwebsdkTester/nimwebsdkTester_${version}_${nodeEnv}`;
const htmlDestDir = `./dist/nimwebsdkTester/nimwebsdkTester_${version}_${nodeEnv}/web`;
const signalingDir = `./dist/nimwebsdkTester/nimwebsdkTester_${versyarnion}_${nodeEnv}/web/signaling`;

console.log("nodeEnv version", nodeEnv, version, webrtcG2Version);
console.log('tester PLATFORM: ', process.env.PLATFORM);

if (process.env.PLATFORM == 'g2') {
  // 修改webrtcG2的SDK
  const webrtc2DestDir = `./dist/nimwebsdkTester/nimwebsdkTester_${webrtcG2Version}_${nodeEnv}`;
  const webtc2HtmlDestDir = `./dist/nimwebsdkTester/nimwebsdkTester_${webrtcG2Version}_${nodeEnv}/web`;
  console.log("webrtc2DestDir：", webrtc2DestDir);
  console.log("webtc2HtmlDestDir：", webtc2HtmlDestDir);
  
  fse.emptyDirSync(webrtc2DestDir);
  fse.copySync(testerSrcDir, webrtc2DestDir, {
    clobber: true
  });

  var webrtc2Files = fs.readdirSync(webtc2HtmlDestDir);
  webrtc2Files = webrtc2Files.filter(item => {
    console.log('遍历web目录: ', item)
    if (/webrtc2/i.test(item)) {
      return true;
    }
    return false;
  });
  console.log('webrtc2Files: ', webrtc2Files)
  webrtc2Files.map(item => {
    rename(path.join(webtc2HtmlDestDir, item));
  });
} else if (env.notDevelopment()) {
  // 将 tester 文件夹拷贝到 dist
  fse.emptyDirSync(testerDestDir);
  fse.copySync(testerSrcDir, testerDestDir, {
    clobber: true
  });

  var files = fs.readdirSync(htmlDestDir);

  files = files.filter(item => {
    if (/\.html$/i.test(item) || /whiteboard\.js$/.test(item)) {
      return true;
    }
    return false;
  });

  console.log("change appKey",  config.auth.appKey);
  console.log("change token", config.auth.token);
  console.log("change remoteAddress", config.auth.chatroomAddress);
  console.log("\n");
  console.log("libNames.sdk", libNames.sdk);
  console.log("libNames.netcall", libNames.netcall);
  console.log("libNames.webrtc", libNames.webrtc);
  console.log("libNames.whiteboard", libNames.whiteboard);
  console.log("libNames.nrtc", libNames.nrtc);
  console.log("libNames.nbb", libNames.nbb);
  console.log("\n");
  console.log("minLibNames.sdk", minLibNames.sdk);
  console.log("minLibNames.netcall", minLibNames.netcall);
  console.log("minLibNames.webrtc", minLibNames.webrtc);
  console.log("minLibNames.whiteboard", minLibNames.whiteboard);
  console.log("minLibNames.nrtc", minLibNames.nrtc);
  console.log("minLibNames.nbb", minLibNames.nbb);
  console.log("\n");

  files.map(item => {
    rename(path.join(htmlDestDir, item));
  });

  // 修改独立信令的SDK
  if (fs.existsSync(signalingDir)) {
    let dirs = fs.readdirSync(signalingDir);
    let changeScript = f => {
      let data = fs.readFileSync(f, "utf-8");
      data = data.replace(
        /<script.+NIM_Web_SDK.+<\/script>/,
        '<script src="../../js/nim/' + minLibNames.sdk + '"></script>'
      );
      data = data.replace(
        /<script.+NIM_Web_NIM.+<\/script>/,
        '<script src="../../js/nim/' + minLibNames.im + '"></script>'
      );
      fs.writeFileSync(f, data);
    };
    if (dirs.length) {
      let htmlReg = /\.html$/;
      dirs.filter(x => !/\.DS_Store/.test(x))
        .map(dir => path.join(signalingDir, dir)).forEach(dir => {
          let files = fs.readdirSync(dir);
          files = files.filter(file => htmlReg.test(file));
          if (files.length) {
            files.map(x => path.join(dir, x)).forEach(changeScript);
          }
        });
    }
  }
  // zip tester
  zip(testerDestDir, "", `nimwebsdkTester_${version}_${nodeEnv}`);
  // NRTC打包
  zip(htmlDestDir, `./dist/nimwebsdkTester/NRTC_${version}`, `NRTC_${version}`);
}

// 文件模板改动:环境相关的参数
// 修改 appkey, token, script
function rename(srcPath, distPath) {
  //console.log('start rename srcPath: ', srcPath)
  //console.log('start rename distPath: ', distPath)
  let data = fse.readFileSync(srcPath, "utf-8");
  data = data.replace(
    /(appKey.*?value=)(".*?")/g,
    "$1" + '"' + config.auth.appKey + '"'
  );
  data = data.replace(
    /(token.*?value=)(".*?")/g,
    "$1" + '"' + config.auth.token + '"'
  );
  data = data.replace(
    /(chatroomAddress.*?value=)(".*?")/g,
    "$1" + '"' + config.auth.chatroomAddress + '"'
  );
  data = data.replace(
    /(appKey: )('.*?')/gi,
    "$1" + "'" + config.auth.appKey + "'"
  );
  data = data.replace(
    /(token: )('.*?')/g,
    "$1" + "'" + config.auth.token + "'"
  );

  const sdkScript = data.match(/<script.+NIM_Web_SDK.+<\/script>/);
  if (sdkScript) {
    data = data.replace(
      sdkScript[0],
      '<script src="./js/nim/' + minLibNames.sdk + '"></script>'
    );
  }

  const nimScript = data.match(/<script.+NIM_Web_NIM.+<\/script>/);
  if (nimScript) {
    data = data.replace(
      nimScript[0],
      '<script src="./js/nim/' + minLibNames.im + '"></script>'
    );
  }

  const netcallScript = data.match(/<script.+NIM_Web_Netcall.+<\/script>/);
  if (netcallScript) {
    data = data.replace(
      netcallScript[0],
      '<script src="./js/nim/' + minLibNames.netcall + '"></script>'
    );
  }

  const webrtcScript = data.match(/<script.+NIM_Web_WebRTC\..+<\/script>/);
  if (webrtcScript) {
    data = data.replace(
      webrtcScript[0],
      '<script src="./js/nim/' + minLibNames.webrtc + '"></script>'
    );
  }

  const webrtc2Script = data.match(/<script.+NIM_Web_WebRTC2\..+<\/script>/);
  if (webrtc2Script) {
    data = data.replace(
      webrtc2Script[0],
      '<script src="./js/nim/' + minLibNames.webrtc2 + '"></script>'
    );
  }

  const whiteboardScript = data.match(
    /<script.+NIM_Web_WhiteBoard.+<\/script>/
  );
  if (whiteboardScript) {
    data = data.replace(
      whiteboardScript[0],
      '<script src="./js/nim/' + minLibNames.whiteboard + '"></script>'
    );
  }

  const nrtcScript = data.match(/<script.+NIM_Web_NRTC\..+<\/script>/);
  if (nrtcScript) {
    data = data.replace(
      nrtcScript[0],
      '<script src="./js/nim/' + minLibNames.nrtc + '"></script>'
    );
  }

  const nbbScript = data.match(/<script.+NIM_Web_NBB.+<\/script>/);
  if (nbbScript) {
    data = data.replace(
      nbbScript[0],
      '<script src="./js/nim/' + minLibNames.nbb + '"></script>'
    );
  }

  fse.outputFileSync(distPath || srcPath, data);

  console.log("rename done: ", srcPath);
}

// 打包
function zip(srcDir, destDir, name) {
  name = name || srcDir;
  destDir = destDir || srcDir;
  file.zip(destDir + ".zip", {
    sources: [
      {
        type: "directory",
        path: srcDir,
        name
      }
    ],
    done() {
      console.log("zip tester done");
    },
    onerror(err) {
      throw err;
    }
  });
}
