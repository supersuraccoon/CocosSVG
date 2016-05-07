cc.game.onStart = function(){
    cc.view.enableRetina(cc.sys.os === cc.sys.OS_IOS ? true : false);
    cc.view.adjustViewPort(true);
    cc.view.setDesignResolutionSize(900, 640, cc.ResolutionPolicy.SHOW_ALL);
    cc.view.resizeWithBrowserSize(false);
    cc.LoaderScene.preload(g_resources, function () {
        cc.director.runScene(new HelloWorldScene());
    }, this);
};
cc.game.run();