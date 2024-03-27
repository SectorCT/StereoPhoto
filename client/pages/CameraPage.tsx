import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";

import { useIsFocused } from '@react-navigation/native';

import {
  Camera,
  CameraType,
  FlashMode,
  CameraCapturedPicture,
} from "expo-camera";

import Button from "../Button";

import { StackNavigationProp } from "@react-navigation/stack";
import { NavStackParamList } from "../Navigation";

const { width, height } = Dimensions.get("screen");
let screenAspectRatio = height / width;

import Constants from 'expo-constants';
const GOOGLE_API_KEY = Constants.expoConfig?.extra?.GOOGLE_API_KEY;
console.log("GOOGLE_API_KEY", GOOGLE_API_KEY);

interface Props {
  navigation: StackNavigationProp<NavStackParamList, "GraphicScreen">;
  route: {};
}

export default function CameraPage({ navigation, route }: Props) {
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraRatio, setCameraRatio] = useState("20:9"); // Default to 16:9
  const [cameraRatioNumber, setCameraRatioNumber] = useState(20 / 9); // Default to 16:9
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [flashState, setFlashState] = useState(false);
  const [capturedText, setCapturedText] = useState<string>("");
  const isFocused = useIsFocused();

  const prepareRatio = async () => {
    let desiredRatio = "16:9";
    if (Platform.OS === "android" && cameraRef.current) {
      const ratios = await cameraRef.current.getSupportedRatiosAsync();
      let bestRatio = desiredRatio;
      let minDiff = Number.MAX_VALUE;
      for (const ratio of ratios) {
        const parts = ratio.split(":");
        const ratioWidth = parseInt(parts[0], 10);
        const ratioHeight = parseInt(parts[1], 10);
        const aspectRatio = ratioWidth / ratioHeight;
        const diff = Math.abs(aspectRatio - screenAspectRatio);
        if (diff < minDiff) {
          minDiff = diff;
          bestRatio = ratio;
        }
      }
      const parts = bestRatio.split(":");
      const ratioWidth = parseInt(parts[0], 10);
      const ratioHeight = parseInt(parts[1], 10);
      setCameraRatio(bestRatio);
      setCameraRatioNumber(ratioWidth / ratioHeight);
    }
  };

  function toggleFlash() {
    setFlashState(!flashState);
  }

  useEffect(() => {
    if (isCameraReady) {
      prepareRatio();
    }
  }, [isCameraReady]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const recognizeTextFromImage = async (base64Image: string | undefined) => {
    const apiURL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`;

    const requestPayload = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    };

    try {
      const response = await fetch(apiURL, {
        method: "POST",
        body: JSON.stringify(requestPayload),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseJson = await response.json();
      if (responseJson.responses[0].fullTextAnnotation) {
        const detectedText = responseJson.responses[0].fullTextAnnotation.text;
        console.log("Detected Text:", detectedText);
        setCapturedText(detectedText);
      } else {
        console.log("No text detected");
      }
    } catch (error) {
      console.error("Error during text recognition:", error);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      recognizeTextFromImage(photo.base64);
    } else {
      console.error("Camera reference is not available.");
    }
  };

  const handleCapturePress = () => {
    takePicture();
  };

  useEffect(() => {
    async function passToTextInput() {
      await setCapturedText(capturedText.replace(/[\t\n]/g, ""));
      navigation.navigate("TextInputPage", { problem: capturedText });
    }
    if (capturedText) {
      passToTextInput();
    }
  }, [capturedText]);

  return (
    <View style={styles.container}>
      {isFocused && <Camera
        style={StyleSheet.compose(styles.camera, {
          width: width,
          height: width * cameraRatioNumber,
        })}
        type={CameraType.back}
        ratio={cameraRatio}
        ref={cameraRef}
        flashMode={flashState ? FlashMode.torch : FlashMode.off}
        zoom={0}
        onCameraReady={() => setIsCameraReady(true)}
      >
        <View style={{ position: "absolute", top: 0, left: 0, width: width, height: "auto", alignItems: "center", justifyContent: "center" , paddingTop:40}}>
          {/* <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>StereoMath</Text> */}
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            text=""
            size={40}
            onPress={() => {
              navigation.navigate("TextInputPage", { problem: "" });
            }}
            icon="keyboard"
            color="white"
            stylesProp={{ paddingBottom: 40 }}
          />
          <Button
            text=""
            size={70}
            onPress={handleCapturePress}
            icon="circle"
            color="red"
            stylesProp={{ paddingBottom: 40 }}
          />
          <Button
            text=""
            size={40}
            onPress={toggleFlash}
            icon={flashState ? "flash" : "flash-off"}
            color="white"
            stylesProp={{ paddingBottom: 40 }}
          />
        </View>
      </Camera>
}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: width * screenAspectRatio,
  },
  header: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "bold",
    color: "white",
    backgroundColor: "black",
    padding: 10,
  },
  camera: {
    width: width,
    height: width * screenAspectRatio,
    flexDirection: "column-reverse",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  preview: {
    flex: 1,
    resizeMode: "cover",
  },
});
