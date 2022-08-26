/* eslint-disable no-unused-vars */

const fs = require('fs')
const NinjaAPI = require('../poeninjaApi')

const profitCalculation = async (card, item, cur, exalted) => {
  const totalCountItem = item.length

  if (cur === 'ex') {
    const priceExaltedOverage =
      (await item.reduce((prev, current) => {
        return (
          prev +
          (current.exaltedValue ||
            parseFloat(current.chaosEquivalent) /
              parseFloat(exalted[0].chaosEquivalent))
        )
      }, 0)) / totalCountItem

    return parseFloat(
      (priceExaltedOverage - card[0].exaltedValue * card[0].stackSize).toFixed(
        2
      )
    )
  }

  const priceChaosOverage =
    (await item.reduce((prev, current) => {
      return prev + (current.chaosValue || parseFloat(current.chaosEquivalent))
    }, 0)) / totalCountItem

  return parseFloat(
    (priceChaosOverage - card[0].chaosValue * card[0].stackSize).toFixed(2)
  )
}

const itemsListArray = [
  { card: 'The Apothecary', item: 'Mageblood' },
  { card: 'Unrequited Love', item: 'Mirror Shard' },
  { card: 'The Immortal', item: 'House of Mirrors' },
  { card: 'The Doctor', item: 'Headhunter' },
  { card: 'The Fiend', item: 'Headhunter' },
  { card: 'Seven Years Bad Luck', item: 'Mirror Shard' },
  { card: 'Alluring Bounty', item: '10x Exalted Orb' },
  { card: 'The Scout', item: '7x Exalted Orb' },
  { card: 'The Nurse', item: 'The Doctor' },
  { card: "The Dragon's Heart", item: 'Empower Support' },
  { card: 'The Artist', item: 'Enhance Support' },
  { card: 'Succor of the Sinless', item: 'Bottled Faith' },
  { card: 'A Fate Worse Than Death', item: 'Cortex' },
  { card: 'Justified Ambition', item: 'Synthesis Map' },
  { card: 'The Damned', item: 'Soul Ripper' },
  { card: "Nook's Crown", item: 'Bone Helmet' },
  { card: "Keeper's Corruption", item: 'Bone Helmet' },
  { card: 'Wealth and Power', item: 'Enlighten Support' },
  { card: 'Dementophobia', item: '10x Delirium Orb' },
  { card: 'The Sacrifice', item: 'Sacrificial Garb' },
  { card: 'Darker Half', item: '5x Eldritch Chaos Orb' },
  { card: 'The Eye of Terror', item: "Chayula's Pure Breachstone" },
  { card: 'Pride of the First Ones', item: "Farrul's Fur" },
  { card: 'Deadly Joy', item: "The Torrent's Reclamation" },
  { card: 'The Patient', item: 'The Nurse' },
  { card: 'Judging Voices', item: 'The Nurse' },
  { card: 'The Academic', item: 'Inspired Learning' },
  { card: 'The Strategist', item: 'Inspired Learning' },
  { card: "Hunter's Reward", item: 'The Taming' },
  { card: 'Gift of Asenath', item: "Asenath's Gentle Touch" },
  { card: 'The Gulf', item: 'Thread of Hope' }
]

const getAnyItemLinkNinja = (leagueName, arrayItems, name) => {
  const startLink = `https://www.pathofexile.com/trade/search/${leagueName}?q=`
  if (arrayItems) {
    const testName = !!arrayItems[0].baseType
    const query = testName
      ? `${startLink}{"query":{"name":"${
          arrayItems[0].currencyTypeName || arrayItems[0].name
        }"}}`
      : `${startLink}{"query":{"type":"${arrayItems[0].name}"}}`

    return query
  }
  return `https://www.pathofexile.com/trade/search/${leagueName}`
}

const poeninja = async () => {
  try {
    const leaguePoeResponse = await fetch(
      'https://www.pathofexile.com/api/trade/data/leagues'
    )

    const leagueData = await leaguePoeResponse.json()
    const leagueName = leagueData.result[0].text
    const ninjaAPI = new NinjaAPI({
      league: leagueData.result[0].text || 'Standart'
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
    const returnArray = await Promise.all(
      itemsListArray.map(async (element) => {
        const options = {
          league: leagueData.result[0].text
        }
        const exaltedItem = await ninjaAPI.getItem('Exalted Orb', options)
        const cardInfo = await ninjaAPI.getItem(element.card, options)
        const itemInfo = await ninjaAPI.getItem(element.item, options)
        let objItem
        let cardObj
        if (itemInfo !== null && cardInfo !== null) {
          cardObj = {
            cardLink: getAnyItemLinkNinja(leagueName, cardInfo, element.card),
            stackSize: cardInfo[0].stackSize,
            cardChaosValue: cardInfo[0].chaosValue,
            cardExaltedValue: cardInfo[0].exaltedValue
          }
          objItem = {
            itemLink: getAnyItemLinkNinja(leagueName, itemInfo, element.item),
            itemChaosValue:
              itemInfo[0].chaosValue || itemInfo[0].chaosEquivalent,
            itemExaltedValue:
              itemInfo[0].exaltedValue ||
              parseFloat(
                parseFloat(itemInfo[0].chaosEquivalent) /
                  parseFloat(exaltedItem[0].chaosEquivalent)
              ).toFixed(2),
            profitInExalted: await profitCalculation(
              cardInfo,
              itemInfo,
              'ex',
              exaltedItem
            ),
            profitInChaos: await profitCalculation(
              cardInfo,
              itemInfo,
              'chaos',
              exaltedItem
            ),
            profitInChaosPerCard: parseFloat(
              (
                (itemInfo[0].chaosValue ||
                  parseFloat(itemInfo[0].chaosEquivalent)) /
                cardInfo[0].stackSize
              ).toFixed(2)
            ),
            profitInExaltedPerCard: parseFloat(
              (
                (itemInfo[0].exaltedValue ||
                  parseFloat(itemInfo[0].chaosEquivalent) /
                    parseFloat(exaltedItem[0].chaosEquivalent)) /
                cardInfo[0].stackSize
              ).toFixed(2)
            )
          }
          return {
            id: `${element.card}_${element.item}`,
            ...element,
            ...cardObj,
            ...objItem
          }
        }
        return { ...element, id: `${element.card}_${element.item}` }
      })
    )

    return returnArray
  } catch (err) {
    return new Error(err)
  }
}

module.exports = poeninja
