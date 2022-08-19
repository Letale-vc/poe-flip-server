/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { round10 } = require('expected-round')
const fs = require('fs')
const NinjaAPI = require('../../poeninjaApi')
const {
  poeSearchStartedUrl,
  poeFirsRequest,
  poeSecondRequest,
  getLeagueName,
  takeDeliriumOrbInfoFromPoeninja,
  namesFile,
  loadAnyFile,
  saveAnyJsonInFile,
  delay
} = require('./helpers')

const deliriumOrbQuery =
  '{"query":{"status":{"option":"online"},"have":["chaos"],"want":["fine-delirium-orb","singular-delirium-orb","thaumaturges-delirium-orb","diviners-delirium-orb","fossilised-delirium-orb","delirium-orb","cartographers-delirium-orb","jewellers-delirium-orb","primal-delirium-orb","imperial-delirium-orb","abyssal-delirium-orb","kalguuran-delirium-orb","timeless-delirium-orb","blighted-delirium-orb","foreboding-delirium-orb","obscured-delirium-orb","amorphous-delirium-orb","whispering-delirium-orb","fragmented-delirium-orb","skittering-delirium-orb"]},"sort":{"have":"asc"},"engine":"new"}'
const exaltedQuery =
  '{"query":{"status":{"option":"online"},"type":"Exalted Orb","stats":[{"type":"and","filters":[]}]},"sort":{"price":"asc"}}'

let forceStop = true

exports.forceStopChange = (value) => {
  console.log('forseStop')
  forceStop = value
}
const takeExaltedInfoFromPoeninja = async (leagueName) => {
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
    const exaltedInfo = await ninjaAPI.getItem('Exalted Orb', {
      league: leagueName
    })

    return exaltedInfo[0].chaosEquivalent
  } catch (err) {
    console.error(err)
    return new Error(err)
  }
}

const takeChaosValue = async (itemsArray, exaltedChaosEquivalent, card) => {
  const resultValue = itemsArray.reduce(
    (previousValue, currentValue) => {
      const isChaosCurrency = currentValue.listing.price.currency === 'chaos'
      const isExaltedCurrency =
        currentValue.listing.price.currency === 'exalted'
      const l = previousValue.lastPrice
      const a = previousValue.accValue
      const b = currentValue.listing.price.amount
      if (isChaosCurrency) {
        if (l !== 0 && (l * 100) / b < 85) {
          return previousValue
        }
        return {
          accValue: a + b,
          lastPrice: b,
          count: previousValue.count + 1
        }
      }
      if (isExaltedCurrency) {
        const convertExaltedInChaos = b * exaltedChaosEquivalent
        if (l !== 0 && (l * 100) / convertExaltedInChaos < 85) {
          return previousValue
        }
        return {
          accValue: a + convertExaltedInChaos,
          lastPrice: b,
          count: previousValue.count + 1
        }
      }

      return previousValue
    },
    { accValue: 0, lastPrice: 0, count: 0 }
  )

  if (
    card === 'Unrequited Love' &&
    itemsArray[0].item.baseType === 'Mirror Shard'
  ) {
    return Math.round((resultValue.accValue / resultValue.count) * 19)
  }
  return Math.round(resultValue.accValue / resultValue.count)
}
const takeExaltedValue = async (itemsArray, exaltedChaosEquivalent, card) => {
  const resultValues = itemsArray.reduce(
    (previousValue, currentValue) => {
      const isChaosCurrency = currentValue.listing.price.currency === 'chaos'
      const isExaltedCurrency =
        currentValue.listing.price.currency === 'exalted'
      const l = previousValue.lastPrice
      const a = previousValue.accValue
      const b = currentValue.listing.price.amount
      if (isChaosCurrency) {
        const convertChaosInEx = b / exaltedChaosEquivalent
        if (l !== 0 && (l * 100) / convertChaosInEx < 85) {
          return previousValue
        }
        return {
          accValue: b / exaltedChaosEquivalent + a,
          lastPrice: b,
          count: previousValue.count + 1
        }
      }
      if (isExaltedCurrency) {
        if (l !== 0 && (l * 100) / b < 85) {
          return previousValue
        }
        return {
          accValue: a + b,
          lastPrice: b,
          count: previousValue.count + 1
        }
      }
      return previousValue
    },
    { accValue: 0, lastPrice: 0, count: 0 }
  )

  if (
    card === 'Unrequited Love' &&
    itemsArray[0].item.baseType === 'Mirror Shard'
  ) {
    return round10((resultValues.accValue / resultValues.count) * 19, -1)
  }
  return round10(resultValues.accValue / resultValues.count, -1)
}

const makeARequestToAnyItem = async (urls, query, poesessid) => {
  try {
    const firstRequest = await poeFirsRequest(urls.firstUrl, query, poesessid)
    const { id, result } = firstRequest
    const totalTakeResultArray = []
    const howMuchToTakeFromTheResult = result.length <= 10 ? result.length : 10

    for (let i = 1; i <= howMuchToTakeFromTheResult; i += 1) {
      totalTakeResultArray.push(result[i])
    }
    const resultIdsArrayString = totalTakeResultArray.join(',')
    const secondRequest = await poeSecondRequest(
      urls.secondUrl,
      resultIdsArrayString,
      id,
      poesessid
    )
    return { result: secondRequest.result, id }
  } catch (err) {
    throw new Error(err)
  }
}

const getAnyItemLink = (leagueName, Query) => {
  return `https://www.pathofexile.com/trade/search/${leagueName}?q=${Query}`
}

const takeCardInfo = async ({
  urls,
  cardQuery,
  exaltedChaosEquivalent,
  poesessid
}) => {
  try {
    const infoCard = await makeARequestToAnyItem(urls, cardQuery, poesessid)

    const { result } = infoCard
    const card = result[0].item.baseType
    const stackSize = result[0].item.maxStackSize
    const cardChaosValue =
      (await takeChaosValue(result, exaltedChaosEquivalent, card)) || null
    const cardExaltedValue =
      (await takeExaltedValue(result, exaltedChaosEquivalent, card)) || null

    return {
      card,
      stackSize,
      cardChaosValue,
      cardExaltedValue
    }
  } catch (err) {
    throw new Error(err)
  }
}

const takeItemInfo = async ({
  urls,
  itemQuery,
  exaltedChaosEquivalent,
  card,
  leagueName,
  poesessid
}) => {
  try {
    if (itemQuery === '10xExalted Orb' || itemQuery === '7xExalted Orb') {
      return {
        itemChaosValue: Math.round(
          exaltedChaosEquivalent * (itemQuery === '10xExalted Orb' ? 10 : 7)
        ),
        itemExaltedValue: itemQuery === '10xExalted Orb' ? 10 : 7,
        itemLink: getAnyItemLink(leagueName, exaltedQuery)
      }
    }
    if (itemQuery === '10xDelirium Orb') {
      const deliriumInfoPrice = await takeDeliriumOrbInfoFromPoeninja(
        leagueName
      )

      return {
        ...deliriumInfoPrice,
        itemLink: getAnyItemLink(leagueName, deliriumOrbQuery)
      }
    }
    const infoItem = await makeARequestToAnyItem(urls, itemQuery, poesessid)
    const { result } = infoItem
    const checkItemBaseName =
      result[0].item.name !== '' &&
      (result[0].item.baseType !== 'Bone Helmet' ||
        result[0].item.baseType !== 'Sacrificial Garb')

    const item = checkItemBaseName
      ? `${result[0].item.name} ${result[0].item.baseType}`
      : result[0].item.baseType

    const itemChaosValue = await takeChaosValue(
      result,
      exaltedChaosEquivalent,
      card
    )
    const itemExaltedValue = await takeExaltedValue(
      result,
      exaltedChaosEquivalent,
      card
    )
    return {
      item,
      itemChaosValue,
      itemExaltedValue,
      itemLink: getAnyItemLink(leagueName, itemQuery)
    }
  } catch (err) {
    throw new Error(err)
  }
}

const takeRow = async ({ cardQuery, itemQuery, leagueName, poesessid }) => {
  try {
    const searchStartUrls = await poeSearchStartedUrl(leagueName)
    const exaltedChaosEquivalent = await takeExaltedInfoFromPoeninja(leagueName)
    const cardInfo = await takeCardInfo({
      urls: searchStartUrls,
      cardQuery,
      exaltedChaosEquivalent,
      poesessid
    })
    const itemInfo = await takeItemInfo({
      urls: searchStartUrls,
      itemQuery,
      exaltedChaosEquivalent,
      card: cardInfo.card,
      leagueName,
      poesessid
    })
    const profitInExalted = round10(
      itemInfo.itemExaltedValue -
        cardInfo.cardExaltedValue * cardInfo.stackSize,
      -1
    )
    const profitInExaltedPerCard = round10(
      profitInExalted / cardInfo.stackSize,
      -1
    )
    const profitInChaos = Math.round(
      itemInfo.itemChaosValue - cardInfo.cardChaosValue * cardInfo.stackSize
    )
    const profitInChaosPerCard = Math.round(profitInChaos / cardInfo.stackSize)

    return {
      cardLink: getAnyItemLink(leagueName, cardQuery),
      ...cardInfo,
      ...itemInfo,
      profitInExalted,
      profitInExaltedPerCard,
      profitInChaos,
      profitInChaosPerCard
    }
  } catch (err) {
    throw new Error(err)
  }
}

const createOrUpdateData = async (isHaveFile, poesessid) => {
  try {
    const leagueName = await getLeagueName()
    const searchQueries = await loadAnyFile(namesFile.poeQueries)
    if (isHaveFile) {
      const oldRowPoeData = await loadAnyFile(namesFile.poeTradeData)
      await searchQueries.reduce(async (accPromise, current) => {
        const acc = await accPromise
        try {
          const row = await takeRow({
            cardQuery: current.cardQuery,
            itemQuery: current.itemQuery,
            leagueName,
            poesessid
          })

          if (!!row.card && !!row.item) {
            console.log(row)
            let checkIfFindItem = false
            const newArray = acc.map((el) => {
              if (row.card === el.card) {
                checkIfFindItem = true
                return row
              }
              return el
            })
            if (checkIfFindItem) {
              await saveAnyJsonInFile(namesFile.poeTradeData, newArray)
              return newArray
            }
            await saveAnyJsonInFile(namesFile.poeTradeData, [...newArray, row])
            return [...newArray, row]
          }
          return acc
        } catch (err) {
          console.error(err)
          return acc
        } finally {
          await new Promise((res) => {
            setTimeout(res, 25000)
          })
        }
      }, Promise.resolve([...oldRowPoeData]))
      return
    }

    await searchQueries.reduce(async (accPromise, current) => {
      const acc = await accPromise
      try {
        const row = await takeRow({
          cardQuery: current.cardQuery,
          itemQuery: current.itemQuery,
          leagueName
        })

        if (!!row.card && !!row.item) {
          console.log(row)
          await saveAnyJsonInFile(namesFile.poeTradeData, [...acc, row])
          return Promise.resolve([...acc, row])
        }
        return Promise.resolve(acc)
      } catch (err) {
        return acc
      } finally {
        await delay(25000)
      }
    }, Promise.resolve([]))
  } catch (err) {
    console.error(err)
    this.forceStopChange(false)
    throw new Error(err)
  }
}

exports.poeAPI = async (poesessid) => {
  try {
    this.forceStopChange(true)
    while (forceStop) {
      const isHaveFile = fs.existsSync('poeData.json')
      try {
        await createOrUpdateData(isHaveFile, poesessid)
        console.log('passed the cycle')
      } catch (err) {
        console.error(err)
        this.forceStopChange(false)
      }
    }
  } catch (err) {
    console.error(err)
    throw new Error(err)
  }
}
