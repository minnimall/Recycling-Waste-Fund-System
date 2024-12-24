const mediaIndex = (req, res)=> {
    res.render('admin/media', { mytitle: 'admin' })
}

const newsIndex = (req, res)=> {
    res.render('admin/news', { mytitle: 'NEWS'})
}
module.exports = {
    mediaIndex,
    newsIndex
}