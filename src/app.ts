import 'dotenv/config';
import express, { Request, Response } from 'express';
import authRoutes from './routes/auth';
import './events/auth.events';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

app.use('/api/auth', authRoutes);
