InboxSDK.load('2', 'sdk_GmailAPI_f30f8371ce').then(function (sdk) {


    sdk.Compose.registerComposeViewHandler(function (composeView) {

        composeView.addButton({
            title: "Encrypt message",
            iconUrl: 'https://pbs.twimg.com/profile_images/599482221402161152/ZIUk-8TB.png',
            onClick: async function (event) {

                const sporocilo = event.composeView.getTextContent(); //dela
                console.log(sporocilo);

                const prejemnik = event.composeView.getToRecipients()[0].emailAddress; //dela
                console.log(prejemnik);

                var publicKeyPrejemnikaArmored = null;

                chrome.storage.sync.get('vsiuporabniki', async function (result) {
                    // console.log(result.vsiuporabniki);
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

    sdk.Conversations.registerMessageViewHandler(function (MessageView) {

        MessageView.addToolbarButton({

            section: 'MORE',
            title: 'Decrypt',
            onClick: function () {

            }
        });
    });
});

