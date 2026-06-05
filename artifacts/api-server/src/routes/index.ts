import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import dishesRouter from "./dishes";
import tablesRouter from "./tables";
import ordersRouter from "./orders";
import ratingsRouter from "./ratings";
import statsRouter from "./stats";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(dishesRouter);
router.use(tablesRouter);
router.use(ordersRouter);
router.use(ratingsRouter);
router.use(statsRouter);
router.use(usersRouter);

export default router;
