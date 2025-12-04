import { basename } from "jsr:@std/path";

type Match = {
    id: number
    event: {
        id: number
        name: string
        code: string | null
    }
    division: {
        id: number
        name: string
        code: string | null
    }
    round: number
    instance: number
    matchnum: number
    scheduled: string
    started: string
    field: string
    scored: boolean
    name: string
    alliances: Array<{
        color: string
        score: number
        teams: Array<{
            team: {
                id: number
                name: string
                code: string | null
            }
            sitting: boolean
        }>
    }>
    updated_at: string
}

async function listJsonFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for await (const dirEntry of Deno.readDir(directory)) {
        if (dirEntry.isFile && dirEntry.name.endsWith('.json')) {
            files.push(`${directory}/${dirEntry.name}`);
        }
    }
    return files;
}

function secondsToMMSS(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

async function calculateTimeDifference(filepath: string) {
    const data = await Deno.readTextFile(filepath)
    const matches: Match[] = JSON.parse(data).data


    matches.sort((a, b) => new Date(a.started).getTime() - new Date(b.started).getTime())

    const matchCycleTimeSeconds: number[] = []
    const matchCycleTimeSecondsOutliers: number[] = []
    let sum = 0
    for (let i = 1; i < matches.length; i++) {
        if (matches[i].round !== 2) continue; //only track qual matches aka round 2

        const previousMatchStartedTime = new Date(matches[i - 1].started).getTime()
        const currentMatchStartedTime = new Date(matches[i].started).getTime()
        const matchCycleTime = (currentMatchStartedTime - previousMatchStartedTime) / 1000 // Time difference in seconds

        if (matchCycleTime < 120) { matchCycleTimeSecondsOutliers.push(matchCycleTime) }
        else if (matchCycleTime > 10 * 60) { matchCycleTimeSecondsOutliers.push(matchCycleTime) }
        else {
            matchCycleTimeSeconds.push(matchCycleTime)
            sum += matchCycleTime
        }
    }
    matchCycleTimeSeconds.sort((a, b) => a - b)
    const AverageCycleTimeSec = sum / matchCycleTimeSeconds.length
    const AverageCycleTime = secondsToMMSS(AverageCycleTimeSec)

    return {
        EventCode: matches[0].event.code,
        FileName: basename(filepath, '.json'),
        AverageCycleTimeSec,
        AverageCycleTime,
        QualTimesSec: matchCycleTimeSeconds,
        QualTimesSecOutliers: matchCycleTimeSecondsOutliers,
    }
}
const output: any = []
const paths = await listJsonFiles('./2025-26-events')
for (const path of paths) {
    const o = await calculateTimeDifference(path)
    output.push(o)
}
//await calculateTimeDifference('./2025-01-11-usu.json')
console.log(output)
