
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


    matches.sort((a, b) => new Date(a.started).valueOf() - new Date(b.started).valueOf())

    const timeDifferences: number[] = []
    const timeOutliers: number[] = []
    let sum = 0
    for (let i = 1; i < matches.length; i++) {
        if (matches[i].round !== 2) continue; //only track qual matches aka round 2

        const previousMatchStartedTime = new Date(matches[i - 1].started).getTime()
        const currentMatchStartedTime = new Date(matches[i].started).getTime()
        const timeDifference = (currentMatchStartedTime - previousMatchStartedTime) / 1000 // Time difference in seconds
        if (timeDifference < 120) { timeOutliers.push(timeDifference) }
        else if (timeDifference > 55 * 60) { timeOutliers.push(timeDifference) }
        else {
            timeDifferences.push(timeDifference)
            sum += timeDifference
        }
    }
    timeDifferences.sort((a, b) => a - b)
    timeOutliers.sort((a, b) => a - b)
    const AverageCycleTimeSec = sum / timeDifferences.length
    const AverageCycleTime = secondsToMMSS(AverageCycleTimeSec)
    // console.log({
    //     EventCode: matches[0].event.code,
    //     EventName: filepath.replace('./events/', '').replace('.json', ''),
    //     AverageCycleTimeSec,
    //     AverageCycleTime,
    //     QualTimes: timeDifferences,
    // })
    return {
        EventCode: matches[0].event.code,
        EventName: filepath.replace('./events/', '').replace('.json', ''),
        AverageCycleTimeSec,
        AverageCycleTime,
        QualTimesSec: timeDifferences,
        QualTimesSecOutliers: timeOutliers,
    }
}
const output: any = []
const paths = await listJsonFiles('./events')
for (const path of paths) {
    const o = await calculateTimeDifference(path)
    output.push(o)
}
//await calculateTimeDifference('./2025-01-11-usu.json')
console.log(output)
