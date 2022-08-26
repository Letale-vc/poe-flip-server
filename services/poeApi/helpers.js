const { round10 } = require('expected-round')
const fs = require('fs')
const path = require('path')
const NinjaAPI = require('../../poeninjaApi')

exports.namesFile = {
  poeQueries: 'poeSearchUrls.json',
  poeTradeData: 'poeData.json',
  ninjaData: 'ninjaData.json'
}

exports.loadAnyFile = async (nameFile) => {
  const pathFile = path.resolve(nameFile)
  const contents = await fs.promises.readFile(path.join(pathFile))

  return JSON.parse(contents)
}

exports.saveAnyJsonInFile = async (nameFile, data) => {
  const pathPoeDataFile = path.resolve(nameFile)
  const stringifyPoeData = JSON.stringify(data, null, 4)
  console.log(`saving file: ${nameFile}`)
  return fs.promises.writeFile(pathPoeDataFile, stringifyPoeData)
}

exports.getLeagueName = async () => {
  try {
    const leaguePoeResponse = await fetch(
      'https://www.pathofexile.com/api/trade/data/leagues'
    )

    const leagueData = await leaguePoeResponse.json()
    const leagueName = leagueData.result[0].text
    return leagueName
  } catch (err) {
    throw new Error(err)
  }
}

exports.poeSearchStartedUrl = async (leagueName) => {
  return {
    firstUrl: `https://www.pathofexile.com/api/trade/search/${leagueName}`,
    secondUrl: 'https://www.pathofexile.com/api/trade/fetch/'
  }
}

exports.poeFirsRequest = async (firstUrl, bodyJson) => {
  try {
    const response = await fetch(firstUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyJson
    })
    return response.json()
  } catch (err) {
    throw new Error(err)
  }
}

exports.poeSecondRequest = async (secondUrl, resultIdsArray, id) => {
  try {
    const response = await fetch(
      `https://www.pathofexile.com/api/trade/fetch/${resultIdsArray}?query=${id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    return response.json()
  } catch (err) {
    throw new Error(err)
  }
}

exports.takeDeliriumOrbInfoFromPoeninja = async (leagueName) => {
  try {
    const ninjaAPI = new NinjaAPI({
      league: leagueName
    })
    if (fs.existsSync('ninjaData.json')) {
      const dateLastUpdate = fs.statSync('ninjaData.json').mtime
      if (Date.now() - dateLastUpdate.getTime() > 3600000) {
        await ninjaAPI.update()
        await ninjaAPI.save()
      } else await ninjaAPI.load()
    } else {
      await ninjaAPI.update()
      await ninjaAPI.save()
    }

    const deliriumInfo = await ninjaAPI.getItem('Delirium orb', {
      league: leagueName
    })
    const totalCountItem = deliriumInfo.length
    const priceOverage = await deliriumInfo.reduce(
      (prev, current) => {
        return {
          itemChaosValue: prev.itemChaosValue + current.chaosValue,
          itemExaltedValue: prev.itemExaltedValue + current.exaltedValue
        }
      },
      { itemChaosValue: 0, itemExaltedValue: 0 }
    )

    return {
      itemChaosValue: Math.round(
        (priceOverage.itemChaosValue / totalCountItem) * 10
      ),
      itemExaltedValue: round10(
        (priceOverage.itemExaltedValue / totalCountItem) * 10,
        -1
      )
    }
  } catch (err) {
    throw new Error(err)
  }
}

exports.delay = (ms) =>
  new Promise((res) => {
    setTimeout(res, ms)
  })
