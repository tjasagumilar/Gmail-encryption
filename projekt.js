InboxSDK.load('2', 'sdk_GmailAPI_f30f8371ce').then(function (sdk) {

    sdk.Compose.registerComposeViewHandler(function (composeView) {

        composeView.addButton({
            title: "Šifriraj Sporočilo",
            iconUrl: 'https://pbs.twimg.com/profile_images/599482221402161152/ZIUk-8TB.png',
            onClick: async function (event) {

                const sporocilo = event.composeView.getTextContent(); //dela
                console.log(sporocilo);

                const prejemnik = event.composeView.getToRecipients()[0].emailAddress; //dela
                console.log(prejemnik);

                var publicKeyPrejemnikaArmored = null;

                chrome.storage.sync.get('vsiuporabniki', async function (result) {
                    var uporabniki = result.vsiuporabniki;

                    for (var i = 0; i < uporabniki.length; i++) {
                        if (uporabniki[i].email == prejemnik) {
                            publicKeyPrejemnikaArmored = uporabniki[i].publicKey;
                        }
                    }

                    const publicKeyPrejemnika = await openpgp.readKey({ armoredKey: publicKeyPrejemnikaArmored }); //dela

                    const encrypted = await openpgp.encrypt({
                        message: await openpgp.createMessage({ text: sporocilo }),
                        encryptionKeys: publicKeyPrejemnika,
                    });

                    event.composeView.setBodyText(encrypted);

                });
            },
        });
    });

    sdk.Compose.registerComposeViewHandler(function (composeView) {

        composeView.addButton({
            title: "Podpiši Sporočilo",
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/2983/2983677.png',
            onClick: async function (event) {

                const sporocilo = event.composeView.getTextContent(); //dela
                // console.log(sporocilo);

                const posiljatelj = event.composeView.getFromContact().emailAddress; //dela
                // console.log(posiljatelj);

                var privateKeyPosiljateljaArmored = null;
                var passphrase = null;

                chrome.storage.sync.get('vsiuporabniki', async function (result) {
                    var uporabniki = result.vsiuporabniki;

                    for (var i = 0; i < uporabniki.length; i++) {
                        if (uporabniki[i].email == posiljatelj) {
                            privateKeyPosiljateljaArmored = uporabniki[i].privateKey;
                            passphrase = uporabniki[i].passphrase;
                        }
                    }

                    const privateKey = await openpgp.decryptKey({
                        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyPosiljateljaArmored }),
                        passphrase
                    });

                    const unsignedMessage = await openpgp.createCleartextMessage({ text: sporocilo });
                    const cleartextMessage = await openpgp.sign({
                        message: unsignedMessage,
                        signingKeys: privateKey
                    });

                    event.composeView.setBodyText(sporocilo + " " + cleartextMessage);

                });


            },
        });
    });

    sdk.Conversations.registerMessageViewHandler(function (MessageView) {

        MessageView.addToolbarButton({

            section: 'MORE',
            title: 'Dešifriraj',
            onClick: function () {

                const sporociloKriptirano = MessageView.getBodyElement();
                console.log(sporociloKriptirano.textContent);

                const prejemniki = MessageView.getRecipientEmailAddresses();
                const prejemnik = prejemniki[0];
                console.log(prejemnik);

                var privateKeyPrejemnikaArmored = null;
                var passphrase = null;

                chrome.storage.sync.get('vsiuporabniki', async function (result) {
                    var uporabniki = result.vsiuporabniki;

                    for (var i = 0; i < uporabniki.length; i++) {
                        if (uporabniki[i].email == prejemnik) {
                            privateKeyPrejemnikaArmored = uporabniki[i].privateKey;
                            passphrase = uporabniki[i].passphrase;
                        }
                    }


                    const privateKey = await openpgp.decryptKey({ //dela
                        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyPrejemnikaArmored }),
                        passphrase
                    });


                    const message = await openpgp.readMessage({
                        armoredMessage: sporociloKriptirano.textContent
                    });

                    const { data: decrypted, signatures } = await openpgp.decrypt({
                        message,
                        decryptionKeys: privateKey
                    });


                    //console.log(decrypted);
                    sporociloKriptirano.textContent = decrypted;

                });
            }
        });
    });

    sdk.Conversations.registerMessageViewHandler(function (MessageView) {

        MessageView.addToolbarButton({

            section: 'MORE',
            title: 'Preveri Podpis',
            onClick: async function () {

                const sporociloPodpisano = MessageView.getBodyElement().textContent; // text + podpis
                //console.log(sporociloPodpisano);

                const signatureStart = sporociloPodpisano.indexOf('-----BEGIN PGP SIGNED MESSAGE');
                const signatureEnd = sporociloPodpisano.indexOf('END PGP SIGNATURE-----') + 'END PGP SIGNATURE-----'.length;
                const podpis = sporociloPodpisano.slice(signatureStart, signatureEnd); // samo podpis
                console.log(podpis);

                const start = sporociloPodpisano.indexOf('-----BEGIN PGP SIGNATURE');
                const headerEnd = sporociloPodpisano.indexOf('\n\n') + 2; 
                const content = sporociloPodpisano.substring(headerEnd, start);


                const posiljatelj = MessageView.getSender().emailAddress;
                //console.log(posiljatelj);

                var publicKeyPosiljateljaArmored = null;

                chrome.storage.sync.get('vsiuporabniki', async function (result) {
                    var uporabniki = result.vsiuporabniki;

                    for (var i = 0; i < uporabniki.length; i++) {
                        if (uporabniki[i].email == posiljatelj) {
                            publicKeyPosiljateljaArmored = uporabniki[i].publicKey;
                        }
                    }

                    const publicKeyPosiljatelja = await openpgp.readKey({ armoredKey: publicKeyPosiljateljaArmored });


                    const signedMessage = await openpgp.readCleartextMessage({
                        cleartextMessage: podpis
                    });

                    const verificationResult = await openpgp.verify({
                        message: signedMessage,
                        verificationKeys: publicKeyPosiljatelja
                    });

                    const { verified, keyID } = verificationResult.signatures[0];
                    try {
                        await verified; // throws on invalid signature
                        console.log('Signed by key id ' + keyID.toHex());
                        alert("Uspešna verifikacija!");
                        MessageView.getBodyElement().textContent = content;
                    } catch (e) {
                        throw new Error('Signature could not be verified: ' + e.message);
                    }

                });


            }
        });
    });
});

