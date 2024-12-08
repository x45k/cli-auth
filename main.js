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
  console.log(`\nNew 2FA key added for ${label}:`);
  const token = speakeasy.totp({
    secret: key.secret,
    encoding: 'base32'
  });
  console.log(`Current OTP: ${token}`);
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

function editKey(index) {
  const data = readData();
  if (index < 0 || index >= data.length) {
    console.log('Invalid key selection.');
    return;
  }

  rl.question('Enter the new label for the key (leave empty to keep current): ', (newLabel) => {
    if (newLabel) {
      data[index].label = newLabel;
    }

    rl.question('Enter the new 2FA secret (leave empty to keep current): ', (newSecret) => {
      if (newSecret) {
        data[index].secret = newSecret.replace(/\s+/g, '');
      }

      saveData(data);
      console.log(`Key updated: ${data[index].label}`);
      showMenu();
    });
  });
}

let refreshInterval;

function displayKeys() {
  const data = readData();
  if (data.length === 0) {
    console.log('No 2FA keys found.');
    showMenu();
    return;
  }

  const display = () => {
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
  };

  display();

  refreshInterval = setInterval(display, 1000);

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key.toString() === '\u001b') {
      clearInterval(refreshInterval);
      console.clear();
      showMenu();
    }
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

function promptForKeyEdit() {
  const data = readData();
  if (data.length === 0) {
    console.log('No keys to edit.');
    showMenu();
    return;
  }

  console.log('\nSelect a key to edit:');
  data.forEach((key, index) => {
    console.log(`${index + 1}. ${key.label}`);
  });

  rl.question('Enter the number of the key to edit: ', (choice) => {
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= data.length) {
      console.log('Invalid selection.');
    } else {
      editKey(index);
    }
  });
}

function searchKeys() {
  rl.question('Enter a label to search for: ', (searchTerm) => {
    if (!searchTerm) {
      console.log('Search term cannot be empty.');
      showMenu();
      return;
    }

    const data = readData();
    const filteredKeys = data.filter(key => key.label.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filteredKeys.length === 0) {
      console.log('No matching keys found.');
    } else {
      console.log('Matching keys found:');
      filteredKeys.forEach((key, index) => {
        const token = speakeasy.totp({
          secret: key.secret,
          encoding: 'base32'
        });
        console.log(`${index + 1}. Label: ${key.label}`);
        console.log(`   Current OTP: ${token}`);
      });
    }

    console.log('\nPress Esc to return to the menu...');
    rl.input.on('keypress', (char, key) => {
      if (key.name === 'escape') {
        showMenu();
      }
    });
  });
}

function showMenu() {
  console.clear();
  console.log('====================');
  console.log('    2FA Manager     ');
  console.log('====================');
  console.log('1. View current 2FA keys');
  console.log('2. Add a new 2FA key');
  console.log('3. Remove a 2FA key');
  console.log('4. Edit a 2FA key');
  console.log('5. Search for a 2FA key');
  console.log('6. Exit');
  console.log('====================');

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
        promptForKeyEdit();
        break;
      case '5':
        searchKeys();
        break;
      case '6':
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
