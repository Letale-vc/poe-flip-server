const { loadAnyFile, namesFile, saveAnyJsonInFile } = require('./helpers')

exports.editQueries = async (newQueries) => {
  try {
    if (Array.isArray(newQueries) && newQueries.length !== 0)
      await saveAnyJsonInFile(namesFile.poeQueries, newQueries)
  } catch (err) {
    throw new Error(err)
  }
}

exports.getQueries = async () => {
  try {
    const queries = await loadAnyFile(namesFile.poeQueries)
    return queries
  } catch (err) {
    throw new Error(err)
  }
}
