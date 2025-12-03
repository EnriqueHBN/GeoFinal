const pinRouter = require('./pin_router');
const reviewRouter = require('./review_router.js');
const routerService = require('./router_service.js');
const userRouter = require('./router_user.js');
const routeZone = require('./route_zone.js');

function routerApi(app) {
  app.use('/pinteres', pinRouter);
  app.use('/review', reviewRouter);
  app.use('/servicio', routerService);
  app.use('/user', userRouter);
  app.use('/zona', routeZone);
}

module.exports = routerApi;
