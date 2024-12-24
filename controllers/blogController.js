const myBlog = require('../models/blogs')

// blog_index
const blog_index = (req, res)=> {
    myBlog.find().sort( {createdAt: -1} )
        .then((result)=> {
            res.render('blogs/index', { mytitle: 'Home', blogs: result })
        })
        .catch((err) => {
            console.log(err)
        })
}

// blog_create_post
// ส่วนบันทึกข้อมูลที่นำไปใช้กับ form action
const blog_creat_post = (req, res) => {
    const blog = new myBlog(req.body)

    blog.save()
        .then((result)=> {
            res.redirect('/blogs')
        })
        .catch((err)=> {
            console.log(err)
        })
}


// blog_create_get
// path ไปหน้า create.ejs สำหรับกรอกฟอร์ม
const blog_create_get = (req, res)=>{
    res.render('blogs/create', { mytitle: 'Create new blog'})
}

// blog_detail
const blog_detail = (req, res) => {
    const bid = req.params.id
    myBlog.findById(bid)
        .then(result => {
            res.render('blogs/details', { mytitle: 'Home',title: 'Blog Details', blog: result})
        })
        .catch(err => {
            res.status(404).render('404', {mytitle: 'Blog not found' })
        })
}

// blog_delete
const blog_delete = (req,res) => {
    const bid = req.params.id
    myBlog.findByIdAndDelete(bid)
        .then(result => {
            res.json({redirect: '/blogs'})
        })
        .catch(err => {
            console.log(err)
        })
}

// blog_edit_get
const blog_edit_get = (req, res) => {
    const bid = req.params.id;
    myBlog.findById(bid)
        .then(result => {
            res.render('blogs/edit', { mytitle: 'Edit Blog', blog: result });
        })
        .catch(err => {
            res.status(404).render('404', { mytitle: 'Blog not found' });
        });
};

// blog_update_put
const blog_update_put = (req, res) => {
    const bid = req.params.id;

    myBlog.findByIdAndUpdate(bid, req.body, { new: true })
        .then(result => {
            res.redirect(`/blogs/${bid}`);
        })
        .catch(err => {
            console.log(err);
            res.status(400).render('404', { mytitle: 'Blog not found' });
        });
};

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    blog_index,
    blog_creat_post,
    blog_create_get,
    blog_detail,
    blog_delete,
    blog_update_put,
    blog_edit_get
}