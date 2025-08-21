window.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const localPeerConnection = new RTCPeerConnection();
    const fileInput = document.getElementById('fileInput');
    const userId = window.currentUserId;
    socket.emit("register_user", { userId });

    let dataChannel;
    let currentSenderId = null;
    let cancelSending = false;
    let cancelReceiving = false;
    let historyVisible = false;

    // ✅ UI elements
    const progressBar = document.createElement("progress");
    progressBar.max = 100;
    progressBar.value = 0;
    progressBar.style.width = "100%";
    progressBar.style.display = "none";
    document.body.appendChild(progressBar);

    const messageBox = document.createElement("div");
    messageBox.style.marginTop = "10px";
    messageBox.style.padding = "10px";
    messageBox.style.border = "1px solid green";
    messageBox.style.backgroundColor = "#e8ffe8";
    messageBox.style.display = "none";
    document.body.appendChild(messageBox);

    window.startConnectionByEmail = async function (receiverEmail) {
        const file = fileInput.files[0];
        if (!file) {
            alert("Please choose a file");
            return;
        }

        const response = await fetch(`/resolve-email?email=${encodeURIComponent(receiverEmail)}`);
        const resJson = await response.json();
        if (resJson.error) {
            alert("Recipient not found!");
            return;
        }

        const receiverId = resJson.user_id;

        cancelSending = false;

        dataChannel = localPeerConnection.createDataChannel("fileChannel");
        setupDataChannelHandlers(dataChannel, file);

        localPeerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    targetId: receiverId,
                    candidate: event.candidate
                });
            }
        };

        const offer = await localPeerConnection.createOffer();
        await localPeerConnection.setLocalDescription(offer);

        socket.emit("offer", {
            senderId: userId,
            receiverId,
            offer
        });
    };

    function setupDataChannelHandlers(channel, file) {
        const chunkSize = 16 * 1024; // 16 KB
        let offset = 0;

        channel.onopen = () => {
            const reader = new FileReader();

            progressBar.style.display = "block";
            progressBar.value = 0;
            messageBox.style.display = "none";
            document.getElementById("senderCancelBtn").style.display = "inline-block";

            const sendChunk = () => {
                if (cancelSending) {
                    channel.send(JSON.stringify({ cancelled: true }));
                    progressBar.style.display = "none";
                    messageBox.innerText = "❌ Transfer Cancelled";
                    messageBox.style.display = "block";
                    return;
                }

                if (offset >= file.size) {
                    channel.send(JSON.stringify({ done: true }));
                    progressBar.style.display = "none";
                    messageBox.innerText = "✅ File shared securely!";
                    messageBox.style.display = "block";
                    return;
                }

                const slice = file.slice(offset, offset + chunkSize);
                reader.readAsArrayBuffer(slice);
            };

            reader.onload = () => {
                const wordArray = CryptoJS.lib.WordArray.create(reader.result);
                const encrypted = CryptoJS.AES.encrypt(wordArray, 'secret-key').toString();

                const payload = {
                    encrypted,
                    filename: file.name,
                    mimeType: file.type,
                    offset
                };

                channel.send(JSON.stringify(payload));
                offset += chunkSize;
                progressBar.value = Math.min((offset / file.size) * 100, 100);

                setTimeout(sendChunk, 10);
            };

            sendChunk();
        };

        channel.onerror = e => console.error("Channel error:", e);

        channel.onclose = () => {
            document.getElementById("senderCancelBtn").style.display = "none";
        };
    }

    socket.on("offer", async ({ senderId, offer }) => {
        currentSenderId = senderId;

        localPeerConnection.ondatachannel = event => {
            const receiveChannel = event.channel;
            const chunks = [];
            let metadata = null;

            receiveChannel.onopen = () => {
                document.getElementById("receiverCancelBtn").style.display = "inline-block";
                cancelReceiving = false;
            };

            receiveChannel.onmessage = async (e) => {
                if (cancelReceiving) return;

                const data = JSON.parse(e.data);

                if (data.cancelled) {
                    messageBox.innerText = "❌ Sender cancelled the transfer.";
                    messageBox.style.display = "block";
                    document.getElementById("receiverCancelBtn").style.display = "none";
                    return;
                }

                if (data.done) {
                    const blob = new Blob(chunks, { type: metadata.mimeType });
                    const url = URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = `Download ${metadata.filename}`;
                    link.download = metadata.filename;
                    link.className = "received-link";
                    document.getElementById("receiveSection").appendChild(link);

                    await fetch('/log-received', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sender_id: currentSenderId,
                            receiver_id: userId,
                            file_name: metadata.filename
                        })
                    });

                    document.getElementById("receiverCancelBtn").style.display = "none";
                    return;
                }

                metadata = metadata || { filename: data.filename, mimeType: data.mimeType };

                const decrypted = CryptoJS.AES.decrypt(data.encrypted, 'secret-key');
                const decryptedWords = decrypted.words;
                const sigBytes = decrypted.sigBytes;
                const byteArray = new Uint8Array(sigBytes);

                for (let i = 0; i < sigBytes; i++) {
                    byteArray[i] = (decryptedWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                }

                chunks.push(byteArray);
            };
        };

        localPeerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    targetId: senderId,
                    candidate: event.candidate
                });
            }
        };

        await localPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await localPeerConnection.createAnswer();
        await localPeerConnection.setLocalDescription(answer);

        socket.emit("answer", {
            senderId: userId,
            receiverId: senderId,
            answer
        });
    });

    socket.on("answer", async ({ answer }) => {
        await localPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ candidate }) => {
        try {
            await localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error("Error adding received ice candidate", err);
        }
    });

    window.cancelSend = () => {
        cancelSending = true;
        document.getElementById("senderCancelBtn").style.display = "none";
    };

    window.cancelReceive = () => {
        cancelReceiving = true;
        messageBox.innerText = "❌ You cancelled the receiving.";
        messageBox.style.display = "block";
        document.getElementById("receiverCancelBtn").style.display = "none";
    };

    window.showReceive = async function () {
        document.getElementById('mainButtons').style.display = 'none';
        document.getElementById('receiveSection').style.display = 'block';

        const response = await fetch('/received-history');
        const files = await response.json();

        const listContainer = document.getElementById('historyList');
        listContainer.innerHTML = "<h4>Received File History:</h4>";

        files.forEach(file => {
            const item = document.createElement('div');
            item.innerHTML = `📄 <strong>${file.file_name}</strong> from user ID: ${file.sender_id} at ${file.timestamp}`;
            listContainer.appendChild(item);
        });
    };

    window.toggleHistory = async function () {
        const listContainer = document.getElementById('historyList');
        if (!historyVisible) {
            const response = await fetch('/received-history');
            const files = await response.json();

            listContainer.innerHTML = "<h4>Received File History:</h4>";
            files.forEach(file => {
                const item = document.createElement('div');
                item.innerHTML = `📄 <strong>${file.file_name}</strong> from user ID: ${file.sender_id} at ${file.timestamp}`;
                listContainer.appendChild(item);
            });

            listContainer.style.display = 'block';
            historyVisible = true;
        } else {
            listContainer.style.display = 'none';
            historyVisible = false;
        }
    };
});
