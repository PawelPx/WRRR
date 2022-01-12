const { ipcRenderer } = require("electron");

import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
// OLD MODEL
// import * as facemesh from "@tensorflow-models/facemesh";

// NEW MODEL
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { drawMesh } from "./utilities";

import "../assets/css/App.css";

import mask0 from "../assets/faces/full-mask-1.png";
import mask1 from "../assets/faces/full-mask-2.png";
import mask2 from "../assets/faces/full-mask-3.png";
import mask3 from "../assets/faces/full-mask-4.png";
import halfmask0 from "../assets/faces/half-mask-1.png";
import halfmask1 from "../assets/faces/half-mask-2.png";
import halfmask2 from "../assets/faces/half-mask-3.png";
import halfmask3 from "../assets/faces/half-mask-4.png";

import Slider from "react-slick";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // const [bottom, setBottom] = useState(0);
  // const [left, setLeft] = useState(0);
  const [cord, setCord] = useState([]);
  const [counter, setCounter] = useState(0);
  const [maskAngle, setMaskAngle] = useState(0);
  const [maskHeight, setMaskHeight] = useState(0);
  const [maskWidth, setMaskWidth] = useState(0);
  const [location, setLocation] = useState([]);

  const [age, setAge] = useState("")

  const images = [
    {
      id: "fullMask1",
      index: 0,
      url: mask0,
    },
    {
      id: "fullMask2",
      index: 1,
      url: mask1,
    },
    {
      id: "fullMask3",
      index: 2,
      url: mask2,
    },
    {
      id: "fullMask4",
      index: 3,
      url: mask3,
    },
    {
      id: "halfMask1",
      index: 4,
      url: halfmask0,
    },
    {
      id: "halfMask2",
      index: 5,
      url: halfmask1,
    },
    {
      id: "halfMask3",
      index: 6,
      url: halfmask2,
    },
    {
      id: "halfMask4",
      index: 7,
      url: halfmask3,
    },
  ];

  const runFacemesh = async (model) => {
    const net = await facemesh.load(
      facemesh.SupportedPackages.mediapipeFacemesh
    );
    setInterval(() => {
      detect(net, model);
    }, 50);
  };

  const detect = async (net, model) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;
      video.style.cssText =
        "-moz-transform: scale(-1, 1); \
      -webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
      transform: scale(-1, 1); filter: FlipH;";

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      tf.engine().startScope()
      const prd = await model.predict(
        tf.browser.fromPixels(video)
        .resizeNearestNeighbor([112, 112])
        .toFloat()
        .expandDims()
      ).data()

      processPreds(prd)

      // Make Detections
      const face = await net.estimateFaces({ input: video });
      tf.engine().endScope()

      // Get canvas context
      const ctx = canvasRef.current.getContext("2d");

      // console.log(face[0].scaledMesh)

      let keypoints = face[0].scaledMesh;

      let minx = 1000; ///////
      let maxx = 0;
      let miny = 1000;
      let maxy = 0; //////

      for (let i = 0; i < keypoints.length; i++) {
        if (keypoints[i][0] > maxx) {
          maxx = keypoints[i][0];
        }
        if (keypoints[i][0] < minx) {
          minx = keypoints[i][0];
        }
        if (keypoints[i][1] > maxy) {
          maxy = keypoints[i][1];
        }
        if (keypoints[i][1] < miny) {
          miny = keypoints[i][1];
        }
      }
      setCord([minx, maxx, miny, maxy]);

      // console.log(minx, maxx, miny, maxy)
      let overhead = keypoints[10];
      let leftCheek = keypoints[234];
      let chin = keypoints[152];
      let rightCheek = keypoints[454];

      const height = Math.sqrt(
        (chin[0] - overhead[0]) ** 2 + (chin[1] - overhead[1]) ** 2
      );
      const width = Math.sqrt(
        (leftCheek[0] - rightCheek[0]) ** 2 +
          (leftCheek[0] - rightCheek[0]) ** 2
      );
      const x0 = (rightCheek[0] + leftCheek[0]) / 2;
      const y0 = (overhead[1] + chin[1]) / 2;
      const dx = x0 - overhead[0];
      const dy = overhead[1] - y0;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      setMaskAngle(angle);
      setMaskHeight(height);
      setMaskWidth(width);
      setLocation([rightCheek[0], overhead[1]]);

      // requestAnimationFrame(()=>{drawMesh(face, ctx)});
    }
  };

  const processPreds = preds => {
    const idx = preds.indexOf(1);
    let dic = {}
    dic["7"] = "60-70_old"
    dic["0"] = "0-10_old"
    dic["1"] = "10-20_old"
    dic["2"] = "100+_old"
    dic["3"] = "20-30_old"
    dic["4"] = "30-40_old"
    dic["5"] = "40-50_old"
    dic["6"] = "50-60_old"
    dic["8"] = "70-80_old"
    dic["9"] = "80-90_old"
    dic["10"] = "90-100_old"

    const res = dic[idx.toString()]

    setAge(old => res ? res : old)
  }

  useEffect(async () => {
    // thats why we need small flask server o host model
    // could find any workaround for this
    // tfjs node from google breaks app
    const model = await tf.loadLayersModel("http://127.0.0.1:5000/js/model.json");
    runFacemesh(model);
  }, []);

  const getMask = () => {
    return images[counter].url;
  };

  const sliderSettings = {
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    swipeToSlide: true,
    focusOnSelect: true,
    className: "slider",
  };

  const onMaskClick = (index) => {
    setCounter(index);
  };

  return (
    <div>
      <>
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />
        <h2>{age}</h2>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}
        ></canvas>

        <img
          src={getMask()}
          style={{
            position: "absolute",
            //left: 670-(130+cord[0] - (cord[1]-cord[0])*0.28),
            //top: 90+cord[2] - (cord[3]-cord[2])*0.22,    old ones
            left: counter > 3 ? 635 - location[0] : 620 - location[0],
            top: counter > 3 ? location[1] + 60 : location[1] - 30,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: counter > 3 ? maskWidth * 0.9 : maskWidth,
            height: counter > 3 ? maskHeight * 0.7 : maskHeight * 1.5,
            transform: `rotate(${maskAngle}deg)`,
          }}
        ></img>
      </>

      <Slider {...sliderSettings}>
        {images.map((image) => {
          return (
            <div className="wrapper" key={image.id}>
              <button
                className="maskButton"
                onClick={() => onMaskClick(image.index)}
              >
                <img className="sliderImg" src={image.url} />
              </button>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default App;
