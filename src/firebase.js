import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAKkU5TJdW8U-qOG0XzbJwfW5cfxXsLXHk",
  authDomain: "keydash-13dd0.firebaseapp.com",
  projectId: "keydash-13dd0",
  storageBucket: "keydash-13dd0.appspot.com",
  messagingSenderId: "2348925381",
  appId: "1:2348925381:web:7acd0acda6a175aa064bac",
  measurementId: "G-CN6CJHT5SQ"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);