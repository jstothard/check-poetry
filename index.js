const fs = require("fs");
const readline = require("readline");
const axios = require("axios");
const words = require("./words_dictionary.json"); // https://github.com/dwyl/english-words

const ratings = [];

async function processLineByLine() {
  console.time("Time");

  const fileStream = fs.createReadStream("poetry.txt");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const accuracy = determineLikelihoodEnglish(line);
    ratings.push({ line, accuracy });
  }

  // Get the three highest accuracy lines
  const topThree = await Promise.all(
    ratings
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3)
      .map(async ({ line }) => line)
  );

  // The api doesn't accept multiple lines at once so remove anything after first punctuation mark
  const singleLine = topThree[0].split(/[?.!]/g)[0];

  const res = await axios.get(
    `https://poetrydb.org/lines/${singleLine}/author,title`
  );

  const poemInfo = res.data[0];

  console.log("Lines:", topThree);
  console.log("Author:", poemInfo.author);
  console.log("Title:", poemInfo.title);
  console.timeEnd("Time");
}

// Check if each word is in the dictionary
// Return the percentage
const determineLikelihoodEnglish = (line) => {
  const noPunct = line.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " "); //https://stackoverflow.com/a/4328546/16868515
  const potentialWords = noPunct.split(" ");
  const accuracy =
    potentialWords.reduce((prev, curr) => {
      if (words[curr]) {
        return ++prev;
      }
      return prev;
    }, 0) / potentialWords.length;

  return accuracy;
};

processLineByLine();
