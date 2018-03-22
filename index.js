'use strict'

const Twitter = require('twitter')
const Sleep = require('sleep')
const access = require('safe-access')
const axios = require('axios')
const fs = require('fs')

const distDir = "dist"

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir)
}

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

function makeDownloadImageRequest(url) {

  const splited = url.split('/')
  const fileName = splited[splited.length - 1]

  return axios({
    method: 'get',
    url: url + ':orig',
    responseType: 'stream'
  })
  .then((response) => {
    console.log("Donwload Completed at " + url)
    response.data.pipe(fs.createWriteStream(distDir + "/" + fileName))
  })
  .catch((error) => {
    console.log(error)
  })
}

function getMediaURLs(tweet) {

  const media = access(tweet, 'entities.media')
  const extendedMedia = access(tweet, 'extended_entities.media')

  var urls = []

  if (media !== undefined) {
    media.filter((e) => {
      return e.type === "photo"
    }).forEach((m) => {
      urls.push(m.media_url_https)
    })
  }

  if (extendedMedia !== undefined) {
    extendedMedia.filter((e) => {
      return e.type === "photo"
    }).forEach((m) => {
      urls.push(m.media_url_https)
    })
  }

  return Array.from(new Set(urls))
}

async function main() {

  var maxId = null

  while (true) {

    try {
      let params =  {count: 5, tweet_mode: 'extended'} 
      if (maxId !== null) { 
        params.max_id = maxId
      }

      const tweets = await client.get('favorites/list', params)

      if (tweets.length === 0) {
        break
      }

      const allRequests = tweets.map((tweet) => {

        const requests = getMediaURLs(tweet).map((url) => {
          return makeDownloadImageRequest(url)
        })
        
        return Promise.all(requests)
      })

      await Promise.all(allRequests)
      maxId = tweets[tweets.length - 1].id

    } catch (error) {
      console.log(error)
      break
    }
  
    Sleep.sleep(30)
  }
}

main()
