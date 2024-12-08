const fs = require('fs');
const path = require('path');
const readline = require('readline');
const speakeasy = require('speakeasy');

const dataFilePath = path.join(__dirname, 'data', 'data.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function readData() {
  if (fs.existsSync(dataFilePath)) {
    const rawData = fs.readFileSync(dataFilePath);
    return JSON.parse(rawData);
  }
  return [];
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

function addKey(label, secret) {
  const key = {
    label,
    secret: secret.replace(/\s+/g, '')
  };
  const data = readData();
  data.push(key);
  saveData(data);
  console.log(`New 2FA key added for ${label}:`);
  console.log(`Secret: ${key.secret}`);
}

function removeKey(index) {
  const data = readData();
  if (index < 0 || index >= data.length) {
    console.log('Invalid key selection.');
    return;
  }

  const removedKey = data.splice(index, 1);
  saveData(data);
  console.log(`Removed 2FA key: ${removedKey[0].label}`);
}

function displayKeys() {
  const data = readData();
  if (data.length === 0) {
    console.log('No 2FA keys found.');
    showMenu();
    return;
  }

  console.clear();

  data.forEach((key, index) => {
    const token = speakeasy.totp({
      secret: key.secret,
      encoding: 'base32'
    });
    const expirationTime = 30 - Math.floor((Date.now() / 1000) % 30);
    console.log(`\nKey ${index + 1}: ${key.label}`);
    console.log(`Current OTP: ${token}`);
    console.log(`Next refresh in: ${expirationTime}s`);
  });

  rl.question('\nPress any key to return to the menu...', () => {
    showMenu();
  });
}

function promptForKey() {
  rl.question('Enter a label for the new key: ', (label) => {
    if (!label) {
      console.log('Label cannot be empty.');
      showMenu();
      return;
    }

    rl.question('Enter the manual 2FA secret (e.g., 4xu7 tzmk rrqc 7erc s6bc 7zeu 2gcj gph3): ', (secret) => {
      if (!secret) {
        console.log('Secret cannot be empty.');
        showMenu();
        return;
      }

      addKey(label, secret);
      showMenu();
    });
  });
}

function promptForKeyRemoval() {
  const data = readData();
  if (data.length === 0) {
    console.log('No keys to remove.');
    showMenu();
    return;
  }

  console.log('\nSelect a key to remove:');
  data.forEach((key, index) => {
    console.log(`${index + 1}. ${key.label}`);
  });

  rl.question('Enter the number of the key to remove: ', (choice) => {
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= data.length) {
      console.log('Invalid selection.');
    } else {
      removeKey(index);
    }
    showMenu();
  });
}

function showMenu() {
  console.clear();
  console.log('1. View current 2FA keys');
  console.log('2. Add a new 2FA key');
  console.log('3. Remove a 2FA key');
  console.log('4. Exit');

  rl.question('Select an option: ', (choice) => {
    switch (choice) {
      case '1':
        displayKeys();
        break;
      case '2':
        promptForKey();
        break;
      case '3':
        promptForKeyRemoval();
        break;
      case '4':
        rl.close();
        process.exit();
        break;
      default:
        console.log('Invalid choice.');
        showMenu();
    }
  });
}

console.log('2FA Manager');
showMenu();
