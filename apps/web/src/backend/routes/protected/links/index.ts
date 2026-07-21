import { Hono } from 'hono'

const app = new Hono()

app.post('/', (c) => c.json('create a book', 201))

export default app
