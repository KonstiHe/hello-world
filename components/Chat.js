import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, } from 'react-native';
import { GiftedChat, Bubble, InputToolbar, SystemMessage } from 'react-native-gifted-chat';
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from '@react-native-community/netinfo';

//const firebase = require('firebase');
//require('firebase/firestore');
import firebase from 'firebase/app';
import "firebase/auth";
import 'firebase/firestore';


// declare empty offline alert system message
let offlineAlert = {
    _id: 1,
    text: "",
    system: true,
};

export default class Chat extends React.Component {
    constructor() {
        super();
        this.state = {
            uid: 0,
            messages: [],
            user: {
                _id: '',
                name: '',
            },
            isConnected: false,
            loggedInText: "Please wait. You’re being authenticated",
        }

        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyChoYxenzsyjW5MVC4SaxM_wF_vci1Pt9Y",

            authDomain: "hello-world-24c69.firebaseapp.com",

            projectId: "hello-world-24c69",

            storageBucket: "hello-world-24c69.appspot.com",

            messagingSenderId: "104647912563",

            appId: "1:104647912563:web:389efa1555747022c1ce06",

            measurementId: "G-0FNF4T6V66"
        };

        let app;


        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig)
        } else {
            app = firebase.app();
        }

        this.referenceChatMessages = firebase.firestore().collection("messages");
    }

    //Get the data
    onCollectionUpdate = (querySnapshot) => {
        if (!this.state.isConnected) return;
        const messages = [];
        // go through each document
        querySnapshot.forEach((doc) => {
            // get the QueryDocumentSnapshot's data
            var data = doc.data();
            messages.push({
                _id: data._id,
                text: data.text,
                createdAt: data.createdAt.toDate(),
                user: data.user,
            });
        });
        this.setState({
            messages,

        });
    };

    addMessages() {
        const message = this.state.messages[0];
        this.referenceChatMessages.add({
            uid: this.state.uid,
            _id: message._id,
            text: message.text || '',
            createdAt: message.createdAt,
            user: message.user,
        });
    }

    async getMessages() {
        let messages = '';
        try {
            messages = await AsyncStorage.getItem('messages') || [];
            this.setState({
                messages: JSON.parse(messages)
            });
        } catch (error) {
            console.log(error.message);
        }
    }

    async saveMessages() {
        try {
            await AsyncStorage.setItem('messages', JSON.stringify(this.state.messages));
        } catch (error) {
            console.log(error.message);
        }
    }

    async deleteMessages() {
        try {
            await AsyncStorage.removeItem('messages');
            this.setState({
                messages: []
            })
        } catch (error) {
            console.log(error.message);
        }
    }


    componentDidMount() {
        let name = this.props.route.params.name;
        this.props.navigation.setOptions({ title: name });
        // this.getMessages();

        // check if online
        NetInfo.fetch().then((connection) => {
            if (connection.isConnected) {
                this.setState({
                    isConnected: true,
                });

                this.authUnsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    if (!user) {
                        firebase.auth().signInAnonymously();
                    }
                    this.setState({
                        uid: user.uid,
                        messages: [],
                        user: {
                            _id: user.uid,
                            name: name,
                        },
                        loggedInText: "Hello there!"
                    });
                    this.referenceChatMessagesUser = firebase.firestore().collection("messages").where("uid", "==", this.state.uid);
                    this.unsubscribeMessagesUser = this.referenceChatMessagesUser.onSnapshot(this.onCollectionUpdate);
                    /*this.unsubscribe = this.referenceChatMessages
                        .orderBy("createdAt", "desc")
                        .onSnapshot(this.onCollectionUpdate);*/
                });

            } else {
                this.setState({
                    isConnected: false,
                });

                // update offline alert system message
                offlineAlert = {
                    _id: 1,
                    text: "You are currently offline. Messages can't be updated or sent.",
                    system: true,
                };
                // get messages from local storage if not online
                this.getMessages();
            }
        });
        this.referenceChatMessages = firebase.firestore().collection("messages");
        //this.unsubscribe = this.referenceChatMessages.onSnapshot(this.onCollectionUpdate);

    }

    componentWillUnmount() {
        this.authUnsubscribe();
        this.unsubscribeMessagesUser();
    }


    onSend(messages = []) {
        this.setState(previousState => ({
            messages: GiftedChat.append(previousState.messages, messages),
        }), () => {
            this.saveMessages();
        });
    }

    renderBubble(props) {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        backgroundColor: '#000'
                    }
                }}
            />
        )
    }

    //render the default InputToolbar only when the user is online
    renderInputToolbar(props) {
        if (this.state.isConnected === false) {
        } else {
            return <InputToolbar {...props} />;
        }
    }

    // custom system message when offline
    renderSystemMessage(props) {
        if (!this.state.isConnected) {
            return <SystemMessage {...props} textStyle={styles.systemMessage} />;
        } else {
        }
    }

    render() {
        let color = this.props.route.params.color;
        return (
            <View style={[{ flex: 1 }, { backgroundColor: color }]}>
                <Text>{this.state.loggedInText}</Text>
                <GiftedChat
                    renderBubble={this.renderBubble.bind(this)}
                    renderInputToolbar={this.renderInputToolbar.bind(this)}
                    renderSystemMessage={this.renderSystemMessage.bind(this)}
                    messages={this.state.isConnected
                        ? this.state.messages
                        : [offlineAlert, ...this.state.messages]}
                    onSend={messages => this.onSend(messages)}
                    user={{
                        _id: this.state.uid,
                    }}
                />
                {Platform.OS === 'android' ? <KeyboardAvoidingView behavior="height" /> : null
                }
            </View>
        );
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 40,
    },
    item: {
        fontSize: 20,
        color: 'blue',
    },
    text: {
        fontSize: 30,
    },
    systemMessage: {
        color: "red",
    },
});

