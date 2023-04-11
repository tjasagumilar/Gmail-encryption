var uporabniki = []

async function generateKeys() {

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const passphrase = document.getElementById('passphrase').value;
    const curve = document.getElementById('curve').value;


    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
        type: 'ecc',
        userIDs: [{ name: name, email: email }],
        curve: 'curve25519',
        passphrase: passphrase,
        format: 'armored'
    });

    console.log(publicKey);

    const uporabnik = {
        name: name,
        email: email,
        publicKey: publicKey,
        privateKey: privateKey,
        passphrase: passphrase
    };

    uporabniki.push(uporabnik);

    chrome.storage.sync.set({ vsiuporabniki: uporabniki }, function () {
        console.log('Data saved to the Chrome storage');
    });

    chrome.storage.sync.get('vsiuporabniki', function (result) {
        console.log(result.vsiuporabniki);
    });

    document.getElementById('output').textContent = "Ključi zgenerirani!"
}

document.getElementById('generiraj').onclick = generateKeys;