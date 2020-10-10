import { openDB, IDBPDatabase } from "idb";
import { Option, assert } from "../util/OptionUtil";
import { RunRef, Run } from "../livesplit-core";
import { databaseRef, fSplitsData, fSplitsInfo, fTicks} from "./firebase";

export type HotkeyConfigSettings = unknown;
export type LayoutSettings = unknown;

const DEFAULT_LAYOUT_WIDTH = 300;

let db: Option<IDBPDatabase<unknown>> = null;

export interface SplitsInfo {
    game: string,
    category: string,
    realTime?: number,
    gameTime?: number,
}

function getSplitsInfo(run: RunRef): SplitsInfo {
    let realTime: number | undefined;
    let gameTime: number | undefined;
    if (run.len() > 0) {
        const time = run.segment(run.len() - 1).personalBestSplitTime();
        console.log('real time: ' + time);
        realTime = time.realTime()?.totalSeconds() ?? 0;
        gameTime = time.gameTime()?.totalSeconds() ?? 0;
    }
    return {
        game: run.gameName(),
        category: run.extendedCategoryName(true, true, true),
        realTime,
        gameTime,
    };
}

function parseSplitsAndGetInfo(splits: Uint8Array): Option<SplitsInfo> {
    return Run.parseArray(splits, "", false).with((r) => {
        if (r.parsedSuccessfully()) {
            return r.unwrap();
        }
        return undefined;
    })?.with(getSplitsInfo);
}

async function getDb(): Promise<IDBPDatabase<unknown>> {
    if (db == null) {
        db = await openDB("LiveSplit", 2, {
            async upgrade(db, oldVersion, _newVersion, tx) {
                const splitsDataStore = db.createObjectStore("splitsData", {
                    autoIncrement: true,
                });
                const splitsInfoStore = db.createObjectStore("splitsInfo", {
                    autoIncrement: true,
                });

                if (oldVersion === 1) {
                    const settingsStore = tx.objectStore("settings");
                    const splits = await settingsStore.get("splits");
                    if (splits != null) {
                        settingsStore.delete("splits");
                        const splitsInfo = parseSplitsAndGetInfo(splits);
                        if (splitsInfo != null) {
                            splitsInfoStore.put(splitsInfo);
                            splitsDataStore.put(splits);
                            settingsStore.put(1, "splitsKey");
                        }
                    }
                } else {
                    const settingsStore = db.createObjectStore("settings", {
                        autoIncrement: true,
                    });

                    const splitsString = localStorage.getItem("splits");
                    if (splitsString) {
                        const splits = new TextEncoder().encode(splitsString);
                        const splitsInfo = parseSplitsAndGetInfo(splits);
                        if (splitsInfo != null) {
                            splitsInfoStore.put(splitsInfo);
                            splitsDataStore.put(splits);
                            settingsStore.put(1, "splitsKey");
                        }
                    }

                    const layout = localStorage.getItem("layout");
                    if (layout) {
                        settingsStore.put(JSON.parse(layout), "layout");
                    }

                    const hotkeys = localStorage.getItem("settings");
                    if (hotkeys) {
                        settingsStore.put(JSON.parse(hotkeys).hotkeys, "hotkeys");
                    }

                    const layoutWidth = localStorage.getItem("layoutWidth");
                    if (layoutWidth) {
                        settingsStore.put(+layoutWidth, "layoutWidth");
                    }
                    localStorage.clear();
                }
            },
        });
    }
    return db;
}

export async function storeRunWithoutDisposing(run: RunRef, key: string | undefined) {
    await storeSplits(
        (callback) => {
            callback(run, run.saveAsLssBytes());
        },
        key,
    );
}

export async function storeRunAndDispose(run: Run, key: string | undefined) {
    try {
        await storeRunWithoutDisposing(run, key);
    } finally {
        run.dispose();
    }
}

export async function storeSplits(
    callback: (callback: (run: RunRef, lssBytes: Uint8Array) => void) => void,
    key: string | undefined,
): Promise<string> {
    // console.log("key: " + key);
    // const db = await getDb();

    // const tx = db.transaction(["splitsData", "splitsInfo"], "readwrite");

    let promise: Promise<unknown> | null = null;
    callback((run, lssBytes) => {
        // We need to consume the bytes first as they are usually very
        // short-living, because they directly point into the WebAssembly memory.
        //promise = tx.objectStore("splitsData").put(lssBytes, key);
        // tx.objectStore("splitsInfo").put(getSplitsInfo(run), key);
        //  fSplitsData.remove();
        //  let splitsDataRef = fSplitsData.push({});

        if (key == undefined) {
            let splitsDataRef = fSplitsData.push(lssBytes);
            console.log(lssBytes);
            // fSplitsInfo.set(getSplitsInfo(run));
            promise = splitsDataRef
            databaseRef.child("splitsInfo/" + splitsDataRef.key).set(getSplitsInfo(run));
        } else {
            databaseRef.child("splitsData/" + key).set(lssBytes);
            databaseRef.child("splitsInfo/" + key).set(getSplitsInfo(run));
        }

    });

    // await tx.done;

    assert(promise !== null, "Callback needs to actually run");
    return promise;
}

export async function getSplitsInfos(): Promise<Array<[string, SplitsInfo]>> {
    const arr: Array<[string, SplitsInfo]> = [];

    return fSplitsInfo.once('value').then(function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            arr.push([childSnapshot.key!, childSnapshot.val()]);
            // console.log("key: " + childSnapshot.key! +  " val: " + childSnapshot.val());
        })
        return arr;
    });
}

export async function loadSplits(key: string): Promise<Uint8Array | undefined> {
    //const db = await getDb();

    if (key == undefined) return undefined;

    // console.log("loadSplits key: " + key);
    // return await db.get("splitsData", key);
    return await fSplitsData.child(key).once('value').then(function(snapshot){
        // console.log("loadSplits: " + snapshot.val());
       return snapshot.val(); 
    });
}

export async function deleteSplits(key: string) {
    const db = await getDb();

    const tx = db.transaction(["splitsData", "splitsInfo"], "readwrite");
    tx.objectStore("splitsData").delete(key);
    tx.objectStore("splitsInfo").delete(key);
    await tx.done;
}

export async function copySplits(key: string) {
    const db = await getDb();

    const tx = db.transaction(["splitsData", "splitsInfo"], "readwrite");
    const splitsData = tx.objectStore("splitsData");
    splitsData.put(await splitsData.get(key));
    const splitsInfo = tx.objectStore("splitsInfo");
    splitsInfo.put(await splitsInfo.get(key));
    await tx.done;
}

export async function storeLayout(layout: LayoutSettings) {
    // const db = await getDb();

    await databaseRef.child('settings/layout').set(layout);
}

export async function loadLayout(): Promise<LayoutSettings | undefined> {
    // const db = await getDb();

    return await databaseRef.child('settings/layout').once('value');
}

export async function storeHotkeys(hotkeys: HotkeyConfigSettings) {
    // const db = await getDb();

    // await db.put("settings", hotkeys, "hotkeys");
    await databaseRef.child('settings/hotkeys').set(hotkeys);
}

export async function loadHotkeys(): Promise<HotkeyConfigSettings | undefined> {
    // const db = await getDb();

    // return await db.get("settings", "hotkeys");
    return await databaseRef.child('settings/hotkeys').once('value');
}

export async function storeLayoutWidth(layoutWidth: number) {
    // const db = await getDb();

    // await db.put("settings", layoutWidth, "layoutWidth");
    await databaseRef.child('settings/layoutWidth').set(layoutWidth);
}

export async function loadLayoutWidth(): Promise<number> {
    // const db = await getDb();

    // return await db.get("settings", "layoutWidth") ?? DEFAULT_LAYOUT_WIDTH;
    return await databaseRef.child('settings/layoutWidth').once('value').then(function(snapshot){
        return snapshot.val() ?? DEFAULT_LAYOUT_WIDTH;
    });
}

export async function storeSplitsKey(splitsKey?: string) {
    // const db = await getDb();

    // await db.put("settings", splitsKey, "splitsKey");
    await databaseRef.child('settings/splitsKey').set(splitsKey);
}

export async function loadSplitsKey(): Promise<string | undefined> {
    // const db = await getDb();

    // return await db.get("settings", "splitsKey");
    return await databaseRef.child('settings/splitsKey').once('value').then(function(snapshot){
        return snapshot.val();
    });
}

export function getTicksRef(): firebase.database.Reference {
    return fTicks;
}