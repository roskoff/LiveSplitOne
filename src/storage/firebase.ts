import firebase from 'firebase/app'
import "firebase/database"
const config = {
    apiKey: process.env.REACT_APP_APIKEY,
    authDomain: process.env.REACT_APP_AUTHDOMAIN,
    databaseURL: process.env.REACT_APP_DB,
    projectId: process.env.REACT_APP_PID,
    storageBucket: process.env.REACT_APP_SB,
    messagingSenderId: process.env.REACT_APP_SID,
    appId: process.env.REACT_APP_APPID
};

firebase.initializeApp(config);

export const databaseRef = firebase.database().ref();
export const fSplitsData = databaseRef.child("splitsData");
export const fSplitsInfo = databaseRef.child("splitsInfo");
export const fTicks = databaseRef.child("ticks");
// fSplitsData.child('-MJFMmbrtT2VUb7qJMdV').set(null);
// fSplitsInfo.child('-MJFMmbrtT2VUb7qJMdV').set(null);
export default firebase;