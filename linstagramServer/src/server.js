import config from "./config.js";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
require('dotenv').config();

const dbClient = new MongoClient(config.db);
const app = express();
app.use();
app.use(express.json());

const users = dbClient.db('social').collection('users');

// Получение всех данных
app.get('/data', async (req, res) => {
    try {
        const data = await users.find().toArray();
        res.send(data);
    } catch (error) {
        console.error('Error during fetching data:', error);
        res.send({
            ok: false,
            comment: 'internal server error during fetching data',
            error: error.message
        });
    }
});

// Регистрация пользователя
app.post('/auth/signup', async (req, res) => {
    const data = req.body;
    if (data.username && data.password && Object.keys(data).length === 2) {
        try {
            const inDb = await users.findOne({ username: data.username });
            if (!inDb) {
                const result = await users.insertOne(data);
                res.send({
                    id: result.insertedId.toHexString(),
                    ok: true
                });
            } else {
                res.send({
                    ok: false,
                    comment: 'user already exists'
                });
            }
        } catch (error) {
            console.error('Error during user signup:', error);
            res.send({
                ok: false,
                comment: 'internal server error during signup',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Авторизация пользователя
app.post('/auth/login', async (req, res) => {
    const data = req.body;
    if (data.username && data.password && Object.keys(data).length === 2) {
        try {
            const user = await users.findOne({ username: data.username });
            if (user) {
                if (user.password === data.password) {
                    res.send({
                        ok: true,
                        id: user._id.toHexString()
                    });
                } else {
                    res.send({
                        ok: false,
                        comment: 'incorrect password'
                    });
                }
            } else {
                res.send({
                    ok: false,
                    comment: "user doesn't exist"
                });
            }
        } catch (error) {
            console.error('Error during user login:', error);
            res.send({
                ok: false,
                comment: 'internal server error during login',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Найти текущего пользователя
app.post('/get-user', async (req, res) => {
    const data = req.body;
    if (data.token && Object.keys(data).length === 1) {
        try {
            const user = await users.findOne({ _id: new ObjectId(data.token) });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            res.send(user);
        } catch (error) {
            res.send({
                ok: false,
                comment: 'internal server error during getting users data',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Добавление подписки на аккаунт
app.post('/subscribe', async (req, res) => {
    const data = req.body;
    if (data.token && data.targetToken && Object.keys(data).length === 2) {
        try {
            await users.updateOne(
                { _id: new ObjectId(data.token) },
                { $push: { subscriptions: data.targetToken } }
            );

            await users.updateOne(
                { _id: new ObjectId(data.targetToken) },
                { $push: { subscribers: data.token } }
            );

        } catch (error) {
            res.send({
                ok: false,
                comment: 'internal server error during adding subscriptions list',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Удаление подписки на аккаунт
app.post('/remove-subscribe', async (req, res) => {
    const data = req.body;
    if (data.token && data.targetToken && Object.keys(data).length === 2) {
        try {
            const user = await users.findOne({ _id: new ObjectId(data.token) });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const targetUser = await users.findOne({ _id: new ObjectId(data.targetToken) });
            if (!targetUser) {
                res.send({
                    ok: false,
                    comment: 'target user not found'
                });
                return;
            }

            const updatedSubscriptions = user.subscriptions.filter(token => token !== data.targetToken);
            const updatedSubscribers = targetUser.subscribers.filter(token => token !== data.token);

            await users.updateOne(
                { _id: new ObjectId(data.token) },
                { $set: { subscriptions: updatedSubscriptions } }
            );

            await users.updateOne(
                { _id: new ObjectId(data.targetToken) },
                { $set: { subscribers: updatedSubscribers } }
            );

        } catch (error) {
            res.send({
                ok: false,
                comment: 'internal server error during adding subscriptions list',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Добавление аватарки
app.post('/add-ava', async (req, res) => {
    const data = req.body;

    if (data.token && data.imageUrl && Object.keys(data).length === 2) {
        try {
            const user = await users.findOne({ _id: new ObjectId(data.token) });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const updateResult = await users.updateOne(
                { _id: new ObjectId(data.token) },
                { $set: { avaUrl: data.imageUrl } }
            );

            if (updateResult.modifiedCount === 1) {
                res.send({
                    ok: true,
                });
            } else {
                res.send({
                    ok: false,
                    comment: 'failed to update avatar'
                });
            }
        } catch (error) {
            console.error('Error during creating ava:', error);
            res.send({
                ok: false,
                comment: 'internal server error during creating ava',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Удаление аватарки
app.post('/remove-ava', async (req, res) => {
    const data = req.body;

    if (data.token && Object.keys(data).length === 1) {
        try {
            const user = await users.findOne({ _id: new ObjectId(data.token) });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const updateResult = await users.updateOne(
                { _id: new ObjectId(data.token) },
                { $set: { avaUrl: "" } }
            );

            if (updateResult.modifiedCount === 1) {
                res.send({
                    ok: true,
                });
            } else {
                res.send({
                    ok: false,
                    comment: 'failed to update avatar'
                });
            }
        } catch (error) {
            console.error('Error during creating ava:', error);
            res.send({
                ok: false,
                comment: 'internal server error during creating ava',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Создание поста
app.post('/posts', async (req, res) => {
    const data = req.body;
    if ((data.user && data.text && data.imageUrl && Object.keys(data).length === 3) || (data.user && data.imageUrl && Object.keys(data).length === 3)) {
        try {
            const user = await users.findOne({ _id: new ObjectId(data.user) });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const newPost = {
                text: data.text,
                token: data.user,
                imageUrl: data.imageUrl,
                time: Date.now()
            };

            await users.updateOne(
                { _id: new ObjectId(data.user) },
                { $push: { posts: newPost } }
            );

            res.send({
                ok: true,
            });
        } catch (error) {
            console.error('Error during creating post:', error);
            res.send({
                ok: false,
                comment: 'internal server error during creating post',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Удаление поста
app.post('/delete-post', async (req, res) => {
    const data = req.body;
    if (data.token && data.imageUrl && Object.keys(data).length === 2) {
        try {
            const user = await users.findOne({ _id: new ObjectId(data.token) });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const updatedPosts = user.posts.filter(
                post => post.imageUrl !== data.imageUrl
            );

            await users.updateOne(
                { _id: new ObjectId(data.token) },
                { $set: { posts: updatedPosts } }
            );

            res.send({
                ok: true,
            });
        } catch (error) {
            console.error('Error during deleting post:', error);
            res.send({
                ok: false,
                comment: 'internal server error during deleting post',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Получение всех постов
app.get('/posts', async (req, res) => {
    try {
        const data = await users.find().toArray();
        let posts = [];
        for (let user of data) {
            if (!user.posts) {
                continue;
            }
            user.posts = user.posts.map(p => ({ ...p, name: user.username }));
            posts = [...posts, ...user.posts];
        }
        posts = posts.sort((a, b) => b.time - a.time);
        res.send(posts);
    } catch (error) {
        console.error('Error during fetching posts:', error);
        res.send({
            ok: false,
            comment: 'internal server error during fetching posts',
            error: error.message
        });
    }
});

// Получение всех постов по подпискам
app.post('/get-posts', async (req, res) => {
    const data = req.body;

    if (data.token && Object.keys(data).length === 1) {
        try {
            const tokenObjectId = new ObjectId(data.token);

            const usersList = await users.find().toArray();
            let posts = [];

            for (let user of usersList) {
                if (!user.posts || user.posts.length === 0) {
                    continue;
                }

                const isCurrentUser = user._id.equals(tokenObjectId);
                const isSubscribedUser = user.subscribers && user.subscribers.includes(data.token);

                if (isCurrentUser || isSubscribedUser) {
                    const userPosts = user.posts.map(p => ({ ...p, name: user.username }));
                    posts = posts.concat(userPosts);
                }
            }

            posts.sort((a, b) => b.time - a.time);

            res.send(posts);
        } catch (error) {
            console.error('Error during fetching posts:', error);
            res.send({
                ok: false,
                comment: 'internal server error during fetching posts',
                error: error.message
            });
        }
    }
});

// Лайк поста по username пользователя
app.post('/posts/like', async (req, res) => {
    const data = req.body;
    if (data.user && data.token && data.imageUrl && Object.keys(data).length === 3) {
        try {
            const user = await users.findOne({ username: data.user });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const postIndex = user.posts.findIndex(post => post.imageUrl === data.imageUrl);
            if (postIndex === -1) {
                res.send({
                    ok: false,
                    comment: 'post not found'
                });
                return;
            }

            if (user.posts[postIndex].likes) {
                user.posts[postIndex].likes.push(data.token);
            } else {
                user.posts[postIndex].likes = [data.token];
            }

            await users.updateOne(
                { username: data.user, 'posts.imageUrl': data.imageUrl },
                { $set: { 'posts.$.likes': user.posts[postIndex].likes } }
            );

            res.send({
                ok: true,
            });
        } catch (error) {
            console.error('Error during liking post:', error);
            res.send({
                ok: false,
                comment: 'internal server error during liking post',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Удаление лайка из поста по username пользователя
app.post('/posts/unlike', async (req, res) => {
    const data = req.body;
    if (data.user && data.token && data.imageUrl && Object.keys(data).length === 3) {
        try {
            const user = await users.findOne({ username: data.user });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const postIndex = user.posts.findIndex(post => post.imageUrl === data.imageUrl);
            if (postIndex === -1) {
                res.send({
                    ok: false,
                    comment: 'post not found'
                });
                return;
            }

            const likes = user.posts[postIndex].likes || [];
            const likeIndex = likes.indexOf(data.token);
            if (likeIndex !== -1) {
                likes.splice(likeIndex, 1);
            }

            await users.updateOne(
                { username: data.user, 'posts.imageUrl': data.imageUrl },
                { $set: { 'posts.$.likes': likes } }
            );

            res.send({
                ok: true,
            });
        } catch (error) {
            console.error('Error during unliking post:', error);
            res.send({
                ok: false,
                comment: 'internal server error during unliking post',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Лайк коммента по username пользователя
app.post('/posts/comment/like', async (req, res) => {
    const data = req.body;
    console.log('Request received:', req.body);
    if (data.user && data.token && data.imageUrl && data.id && Object.keys(data).length === 4) {
        try {
            const user = await users.findOne({ username: data.user });
            if (!user) {
                res.status(404).send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const postIndex = user.posts.findIndex(post => post.imageUrl === data.imageUrl);
            if (postIndex === -1) {
                res.status(404).send({
                    ok: false,
                    comment: 'post not found'
                });
                return;
            }

            const commentIndex = user.posts[postIndex].comments.findIndex(comment => comment.id === data.id);
            if (commentIndex === -1) {
                res.status(404).send({
                    ok: false,
                    comment: 'comment not found'
                });
                return;
            }

            const comment = user.posts[postIndex].comments[commentIndex];
            if (!comment.likes) {
                comment.likes = [];
            }
            comment.likes.push(data.token);

            await users.updateOne(
                { username: data.user, 'posts.imageUrl': data.imageUrl },
                { $set: { 'posts.$[p].comments.$[c].likes': comment.likes } },
                { arrayFilters: [{ 'p.imageUrl': data.imageUrl }, { 'c.id': data.id }] }
            );

            res.send({
                ok: true,
                comment: 'like added successfully'
            });
        } catch (error) {
            console.error('Error during liking post:', error);
            res.status(500).send({
                ok: false,
                comment: 'internal server error during liking post',
                error: error.message
            });
        }
    } else {
        res.status(400).send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Удаление лайка с коммента по username пользователя
app.post('/posts/comment/unlike', async (req, res) => {
    const data = req.body;
    if (data.user && data.token && data.imageUrl && data.id && Object.keys(data).length === 4) {
        try {
            const user = await users.findOne({ username: data.user });
            if (!user) {
                res.status(404).send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const postIndex = user.posts.findIndex(post => post.imageUrl === data.imageUrl);
            if (postIndex === -1) {
                res.status(404).send({
                    ok: false,
                    comment: 'post not found'
                });
                return;
            }

            const commentIndex = user.posts[postIndex].comments.findIndex(comment => comment.id === data.id);
            if (commentIndex === -1) {
                res.status(404).send({
                    ok: false,
                    comment: 'comment not found'
                });
                return;
            }

            const comment = user.posts[postIndex].comments[commentIndex];
            if (!comment.likes) {
                comment.likes = [];
            }
            const likeIndex = comment.likes.indexOf(data.token);
            if (likeIndex !== -1) {
                comment.likes.splice(likeIndex, 1);
            }

            await users.updateOne(
                { username: data.user, 'posts.imageUrl': data.imageUrl },
                { $set: { 'posts.$[p].comments.$[c].likes': comment.likes } },
                { arrayFilters: [{ 'p.imageUrl': data.imageUrl }, { 'c.id': data.id }] }
            );

            res.send({
                ok: true,
                comment: 'like removed successfully'
            });
        } catch (error) {
            console.error('Error during unliking post:', error);
            res.status(500).send({
                ok: false,
                comment: 'internal server error during unliking post',
                error: error.message
            });
        }
    } else {
        res.status(400).send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Добавление комментария
app.post('/posts/add-comment', async (req, res) => {
    const data = req.body;
    console.log('Incoming data:', data);  // Логирование входящих данных
    if (data.user && data.token && data.imageUrl && data.text && Object.keys(data).length === 4) {
        try {
            const poster = await users.findOne({ _id: new ObjectId(data.token) });
            if (!poster) {
                return res.json({
                    ok: false,
                    comment: 'poster not found'
                });
            }

            const user = await users.findOne({ username: data.user });
            if (!user) {
                return res.json({
                    ok: false,
                    comment: 'user not found'
                });
            }

            const postIndex = user.posts.findIndex(post => post.imageUrl === data.imageUrl);
            if (postIndex === -1) {
                return res.json({
                    ok: false,
                    comment: 'post not found'
                });
            }

            const newComment = {
                id: uuidv4(),
                token: data.token,
                username: poster.username,
                text: data.text
            };

            if (user.posts[postIndex].comments) {
                user.posts[postIndex].comments.push(newComment);
            } else {
                user.posts[postIndex].comments = [newComment];
            }

            await users.updateOne(
                { username: data.user, 'posts.imageUrl': data.imageUrl },
                { $set: { 'posts.$.comments': user.posts[postIndex].comments } }
            );

            return res.json({
                ok: true,
                id: newComment.id
            });
        } catch (error) {
            console.error('Error during adding comment:', error);
            return res.json({
                ok: false,
                comment: 'internal server error during adding comment',
                error: error.message
            });
        }
    } else {
        return res.json({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

// Удаление комментария
app.post('/posts/remove-comment', async (req, res) => {
    const data = req.body;
    if (data.user && data.token && data.imageUrl && data.id && Object.keys(data).length === 4) {
        try {
            const user = await users.findOne({ username: data.user });
            if (!user) {
                res.send({
                    ok: false,
                    comment: 'user not found'
                });
                return;
            }

            const postIndex = user.posts.findIndex(post => post.imageUrl === data.imageUrl);
            if (postIndex === -1) {
                res.send({
                    ok: false,
                    comment: 'post not found'
                });
                return;
            }

            const comments = user.posts[postIndex].comments || [];
            const commentIndex = comments.findIndex(comment => comment.id === data.id);

            if (commentIndex !== -1 && comments[commentIndex].token === data.token) {
                comments.splice(commentIndex, 1);
            } else {
                res.send({
                    ok: false,
                    comment: 'comment not found or not authorized to delete'
                });
                return;
            }

            await users.updateOne(
                { username: data.user, 'posts.imageUrl': data.imageUrl },
                { $set: { 'posts.$.comments': comments } }
            );

            res.send({
                ok: true,
            });
        } catch (error) {
            console.error('Error during removing comment:', error);
            res.send({
                ok: false,
                comment: 'internal server error during removing comment',
                error: error.message
            });
        }
    } else {
        res.send({
            ok: false,
            comment: 'incorrect request data'
        });
    }
});

app.listen(3000, async () => {
    try {
        await dbClient.connect();
        console.log("DB Connected. Server Started!");
    } catch (error) {
        console.error("Failed to connect to DB", error);
    }
});
